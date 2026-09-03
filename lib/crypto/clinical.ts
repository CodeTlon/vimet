import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// Cifrado simétrico de campos clínicos sensibles (fichas_paciente.dx_medico/
// dx_nutricional/medicacion/datos_laboratorio/observaciones_internas,
// evolucion_entradas.contenido, planes.notas).
//
// La clave vive SOLO en la app (env var `CLINICAL_DATA_ENCRYPTION_KEY`,
// nunca en Postgres): se cifra antes de escribir a Supabase y se descifra
// después de leer, acá en Node, con `node:crypto` (sin librería externa).
// Elegido en vez de `pgcrypto`/`pgp_sym_encrypt` en la DB a propósito — con
// pgcrypto la clave tendría que viajar en cada query (`pgp_sym_encrypt(dato,
// clave)`), quedando expuesta en logs de queries de Supabase y en el plan de
// ejecución; así nunca sale de la memoria del proceso Node. Ver el reporte
// de la sesión que agregó esto para más contexto de la decisión.
//
// Formato de lo que se guarda en las columnas `_enc` (text):
//   v1.<iv base64>.<authTag base64>.<ciphertext base64>
// - AES-256-GCM: cifrado autenticado — un valor manipulado en la base
//   (backup restaurado mal, edición manual, bit-rot) hace fallar el
//   decrypt en vez de devolver basura silenciosa.
// - IV de 96 bits (12 bytes, el recomendado para GCM), random por valor.
// - Prefijo de versión (`v1`) para poder rotar de formato el día de mañana
//   sin romper filas viejas.

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const FORMAT_VERSION = 'v1'

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey
  const raw = process.env.CLINICAL_DATA_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'CLINICAL_DATA_ENCRYPTION_KEY no está seteada — no se pueden leer ni escribir campos clínicos cifrados. ' +
        'Generarla con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))" ' +
        'y setearla como env var ANTES de deployar este código.',
    )
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error(
      `CLINICAL_DATA_ENCRYPTION_KEY debe decodificar (base64) a 32 bytes exactos para AES-256; decodificó a ${key.length} bytes.`,
    )
  }
  cachedKey = key
  return key
}

/**
 * Cifra un string para guardar en una columna `_enc`. `null`/`undefined`/`''`
 * pasan a `null` (no hay nada que cifrar — evita guardar un blob cifrado de
 * cadena vacía que después hay que andar distinguiendo de "no cargado").
 */
export function encryptClinical(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null
  const key = getKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [
    FORMAT_VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.')
}

/**
 * Descifra un valor guardado por `encryptClinical`. Devuelve `null` si la
 * entrada es `null`/`undefined`/`''`. Tira si el valor no matchea el
 * formato esperado o si el authTag de GCM no valida (dato corrupto o
 * manipulado) — mejor un error ruidoso en el server log que mostrarle a un
 * profesional de salud un diagnóstico o medicación truchos sin darse cuenta.
 */
export function decryptClinical(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined || stored === '') return null
  const parts = stored.split('.')
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error(
      'Valor cifrado con formato desconocido (¿CLINICAL_DATA_ENCRYPTION_KEY cambió, o el dato no está realmente cifrado?).',
    )
  }
  const [, ivB64, tagB64, ciphertextB64] = parts
  const key = getKey()
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}

/**
 * Lee un campo clínico que puede venir en su forma nueva cifrada (columna
 * `_enc`) o vieja en texto plano (fila todavía no pasada por el backfill de
 * `scripts/migrar-cifrado-clinico.mjs`, o el feature recién deployado sin
 * migrar históricos aún). Usar SIEMPRE esta función para leer estos campos
 * en vez de leer la columna vieja directo — así el mismo código de
 * lectura sirve antes, durante y después del backfill.
 */
export function readClinicalField(
  encValue: string | null | undefined,
  plainValue: string | null | undefined,
): string | null {
  if (encValue) return decryptClinical(encValue)
  return plainValue ?? null
}
