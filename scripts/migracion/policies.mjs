// Parser de policies RLS de supabase/migrations/*.sql.
// Recorre las migraciones en orden y calcula el estado final (create/drop),
// ademas del total de sentencias `create policy` (la cifra historica de 71).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function limpiar(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ')
}

// Devuelve el contenido del primer par de parentesis balanceado que arranca en `desde`.
function parentesis(texto, desde) {
  const ini = texto.indexOf('(', desde)
  if (ini < 0) return null
  let prof = 0
  let enString = false
  for (let i = ini; i < texto.length; i++) {
    const c = texto[i]
    if (c === "'") enString = !enString
    if (enString) continue
    if (c === '(') prof++
    if (c === ')') {
      prof--
      if (prof === 0) return { texto: texto.slice(ini + 1, i), fin: i + 1 }
    }
  }
  return null
}

const norm = (s) => s.replace(/\s+/g, ' ').trim()
const sinComillas = (s) => s.replace(/^"|"$/g, '')

export function parsearPolicies(dir) {
  const archivos = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  const eventos = []
  let sentenciasCreate = 0

  for (const archivo of archivos) {
    const sql = limpiar(readFileSync(join(dir, archivo), 'utf8'))
    const re = /\b(create|drop)\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|[\w]+)\s+on\s+([\w."]+)/gi
    let m
    while ((m = re.exec(sql))) {
      const accion = m[1].toLowerCase()
      const nombre = sinComillas(m[2])
      const tabla = m[3].replace(/"/g, '')
      if (accion === 'drop') {
        eventos.push({ accion, nombre, tabla, archivo })
        continue
      }
      sentenciasCreate++
      const fin = sql.indexOf(';', m.index)
      const cuerpo = sql.slice(re.lastIndex, fin < 0 ? undefined : fin)
      const op = (cuerpo.match(/\bfor\s+(select|insert|update|delete|all)\b/i) || [])[1]?.toLowerCase() ?? 'all'
      const rol = (cuerpo.match(/\bto\s+([\w, ]+?)(?=\s+(using|with)\b|$)/i) || [])[1]?.trim() ?? null
      const iUsing = cuerpo.search(/\busing\s*\(/i)
      const iCheck = cuerpo.search(/\bwith\s+check\s*\(/i)
      const using = iUsing >= 0 ? parentesis(cuerpo, iUsing)?.texto : null
      const check = iCheck >= 0 ? parentesis(cuerpo, iCheck)?.texto : null
      eventos.push({
        accion,
        nombre,
        tabla,
        archivo,
        op,
        rol,
        using: using ? norm(using) : null,
        check: check ? norm(check) : null,
      })
    }
  }

  // Estado final: una policy se identifica por (tabla, nombre).
  const finales = new Map()
  const dropeadas = []
  for (const e of eventos) {
    const k = `${e.tabla}::${e.nombre}`
    if (e.accion === 'create') finales.set(k, e)
    else if (finales.delete(k)) dropeadas.push(e)
  }
  return {
    sentenciasCreate,
    efectivas: [...finales.values()],
    creadasYBorradas: dropeadas,
    archivos,
  }
}

// Clasificacion heuristica del guard y del test IDOR (sugerido, requiere revision humana).
export function clasificar(p) {
  const expr = [p.using, p.check].filter(Boolean).join(' AND ')
  const esStorage = p.tabla === 'storage.objects'
  const admin = /is_admin\(\)/.test(expr)
  const staff = /is_staff\(\)/.test(expr)
  const uid = /auth\.uid\(\)/.test(expr)
  const soloTrue = /^\s*true\s*$/i.test(p.using ?? '') && !p.check
  const autenticado = /auth\.role\(\)|auth\.uid\(\)\s+is\s+not\s+null/i.test(expr) && !uid
  const bucket = (expr.match(/bucket_id\s*=\s*'([^']+)'/) || [])[1]
  const carpetaF = /foldername\(name\)\)\[2\]\s*=\s*'f'/.test(expr)

  let tipo
  if (soloTrue) tipo = 'publico'
  else if (esStorage && !uid && !staff && !admin) tipo = 'publico-bucket'
  else if (uid && (staff || admin)) tipo = 'dueno-o-staff'
  else if (uid) tipo = 'dueno'
  else if (admin && !staff) tipo = 'admin'
  else if (staff) tipo = 'staff'
  else if (autenticado) tipo = 'autenticado'
  else tipo = 'revisar'

  const t = esStorage ? `storage:${bucket ?? '?'}` : p.tabla.replace(/^public\./, '')
  const opTxt = p.op === 'all' ? 'cualquier operacion' : p.op
  let guard
  let idor
  switch (tipo) {
    case 'publico':
      guard = 'sin guard (lectura publica)'
      idor = `anonimo puede ${opTxt} en ${t}; escritura anonima rechazada`
      break
    case 'publico-bucket':
      guard = 'sin guard (objeto publico del bucket)'
      idor = `anonimo lee objeto de ${t}; no puede escribir`
      break
    case 'admin':
      guard = 'requireAdmin()'
      idor = `staff no-admin y paciente reciben 403 al ${opTxt} en ${t}`
      break
    case 'staff':
      guard = 'requireStaff()'
      idor = `paciente recibe 403 al ${opTxt} en ${t}`
      break
    case 'dueno':
      guard = esStorage
        ? `guard de dueno por prefijo de path${carpetaF ? ' (solo subcarpeta f/)' : ''}`
        : 'requireAuth() + filtro de dueno (id/paciente_id = user.id)'
      idor = `paciente B no puede ${opTxt} fila/objeto de paciente A en ${t}`
      break
    case 'dueno-o-staff':
      guard = 'requireAuth() + (dueno || isStaff)'
      idor = `paciente B no puede ${opTxt} fila de paciente A en ${t}; staff si`
      break
    case 'autenticado':
      guard = 'requireAuth()'
      idor = `anonimo recibe 401 al ${opTxt} en ${t}`
      break
    default:
      guard = 'REVISAR A MANO'
      idor = 'definir segun la expresion'
  }
  return { tipo, guard, idor }
}
