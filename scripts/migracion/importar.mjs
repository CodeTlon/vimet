// Importa los datos de un Supabase (origen) a la base nueva (destino). Sin dependencias de Next ni
// de Supabase: solo necesita dos conexiones con `query(sql, params)` (pg.Client o PGlite).
//
//  - Usuarios: auth.users -> "user" + account (el hash bcrypt se conserva: Better Auth lo verifica).
//  - Tablas de negocio: copia generica por columnas en comun, en orden de dependencias, con los ids
//    originales (OVERRIDING SYSTEM VALUE) y las secuencias reajustadas al final.
//  - Los triggers de usuario se desactivan durante la copia (si no, la auditoria registraria miles
//    de "insert" falsos) y se reactivan despues.
//  - Verificacion: conteo + checksum md5 por tabla comparando origen y destino.
//
// El rewrite de URLs absolutas de storage y la copia de objetos viven en otro paso
// (scripts/migracion/copiar-storage.mjs): este solo toca la base.

/** Orden de copia: cada tabla despues de las que referencia. */
export const TABLAS = [
  'profiles',
  'servicios',
  'horarios_disponibles',
  'bloqueos_horario',
  'contenido_sitio',
  'ejercicios',
  'turnos',
  'fichas_paciente',
  'mediciones_antropometricas',
  'mediciones_wearable',
  'evaluaciones_funcionales',
  'planes',
  'plan_secciones',
  'plan_seccion_comidas',
  'plan_seccion_imagenes',
  'plan_ejercicios',
  'sesiones_entrenamiento',
  'sets_completados',
  'feedback_semanal',
  'feedback_mensajes',
  'evolucion_entradas',
  'objetivos',
  'recursos_paciente',
  'audit_log',
]

const ident = (n) => `"${String(n).replace(/"/g, '""')}"`
const lote = 200

async function columnas(db, tabla, schema = 'public') {
  const { rows } = await db.query(
    `select column_name, is_generated, generation_expression from information_schema.columns
      where table_schema = $1 and table_name = $2 order by ordinal_position`,
    [schema, tabla],
  )
  // Las columnas generadas (puntaje_total) las recalcula la base nueva.
  return rows.filter((c) => c.is_generated !== 'ALWAYS' && !c.generation_expression).map((c) => c.column_name)
}

async function existeTabla(db, tabla, schema = 'public') {
  const { rows } = await db.query(
    `select 1 from information_schema.tables where table_schema = $1 and table_name = $2`,
    [schema, tabla],
  )
  return rows.length > 0
}

async function contar(db, tabla) {
  const { rows } = await db.query(`select count(*)::int as n from ${ident(tabla)}`)
  return rows[0].n
}

async function checksum(db, tabla, cols) {
  const expr = cols.map((c) => `coalesce(${ident(c)}::text, '~')`).join(` || '|' || `)
  const { rows } = await db.query(
    `select md5(coalesce(string_agg(${expr}, ',' order by ${cols.map(ident).join(', ')}), '')) as h from ${ident(tabla)}`,
  )
  return rows[0].h
}

/**
 * @param {{origen: {query: Function}, destino: {query: Function}, aplicar?: boolean, log?: (m: string) => void}} opts
 * @returns {Promise<{usuarios: number, tablas: Record<string, {origen: number, destino: number, coincide: boolean}>, ok: boolean}>}
 */
export async function importarDatos({ origen, destino, aplicar = false, log = console.log }) {
  const resultado = { usuarios: 0, tablas: {}, ok: true }

  // ---- Precondicion: el destino tiene que estar vacio ------------------------------------------
  for (const t of ['user', 'profiles']) {
    const n = await contar(destino, t)
    if (n > 0) throw new Error(`El destino no esta vacio: ${t} tiene ${n} filas. Abortando para no mezclar datos.`)
  }

  const { rows: usuarios } = await origen.query(
    `select u.id::text as id, u.email, u.encrypted_password, u.email_confirmed_at::text as confirmado,
            u.created_at::text as creado, p.nombre, p.apellido
       from auth.users u left join public.profiles p on p.id = u.id order by u.created_at, u.id`,
  )
  resultado.usuarios = usuarios.length
  log(`Usuarios en el origen: ${usuarios.length}`)
  if (!aplicar) log('(dry-run: no se escribe nada; pasar aplicar=true / --apply)')

  if (aplicar) {
    // ---- Usuarios -----------------------------------------------------------------------------
    for (const u of usuarios) {
      if (!u.email) {
        log(`  ! usuario ${u.id} sin email, se saltea`)
        continue
      }
      const nombre = `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim() || u.email
      await destino.query(
        `insert into "user" (id, name, email, email_verified, created_at, updated_at)
         values ($1, $2, $3, $4, coalesce($5::timestamptz, now()), now())`,
        [u.id, nombre, u.email.trim().toLowerCase(), u.confirmado != null, u.creado],
      )
      // Un hash vacio (invitado que nunca eligio contrasena) queda en null: no puede iniciar sesion
      // hasta pasar por "recuperar contrasena".
      await destino.query(
        `insert into account (account_id, provider_id, user_id, password) values ($1, 'credential', $2, $3)`,
        [u.id, u.id, u.encrypted_password ? u.encrypted_password : null],
      )
    }

    // ---- Tablas de negocio --------------------------------------------------------------------
    const conTriggers = []
    for (const t of TABLAS) {
      if (await existeTabla(destino, t)) {
        await destino.query(`alter table ${ident(t)} disable trigger user`)
        conTriggers.push(t)
      }
    }

    try {
      for (const tabla of TABLAS) {
        if (!(await existeTabla(origen, tabla))) {
          log(`  - ${tabla}: no existe en el origen, se saltea`)
          continue
        }
        const colsDest = await columnas(destino, tabla)
        const colsOrigen = new Set(await columnas(origen, tabla))
        let cols = colsDest.filter((c) => colsOrigen.has(c))
        const autoRef = tabla === 'turnos' ? 'turno_par_id' : null
        if (autoRef) cols = cols.filter((c) => c !== autoRef)

        // Todo pasa como texto: evita que el driver reinterprete fechas, numericos o arrays.
        const select = cols.map((c) => `${ident(c)}::text as ${ident(c)}`).join(', ')
        const { rows } = await origen.query(`select ${select} from ${ident(tabla)} order by 1`)

        for (let i = 0; i < rows.length; i += lote) {
          for (const fila of rows.slice(i, i + lote)) {
            const params = cols.map((c) => fila[c])
            await destino.query(
              `insert into ${ident(tabla)} (${cols.map(ident).join(', ')}) overriding system value
               values (${cols.map((_, k) => `$${k + 1}`).join(', ')})`,
              params,
            )
          }
        }

        if (autoRef) {
          const { rows: pares } = await origen.query(
            `select id::text as id, turno_par_id::text as par from turnos where turno_par_id is not null`,
          )
          for (const p of pares) await destino.query(`update turnos set turno_par_id = $2 where id = $1`, [p.id, p.par])
        }
        log(`  ${tabla}: ${rows.length} filas`)
      }
    } finally {
      for (const t of conTriggers) await destino.query(`alter table ${ident(t)} enable trigger user`)
    }

    // ---- Secuencias de identidad --------------------------------------------------------------
    const { rows: identidades } = await destino.query(
      `select table_name, column_name from information_schema.columns
        where table_schema = 'public' and is_identity = 'YES'`,
    )
    for (const { table_name: t, column_name: c } of identidades) {
      await destino.query(
        `select setval(pg_get_serial_sequence($1, $2),
                       greatest((select coalesce(max(${ident(c)}), 0) from ${ident(t)}), 1),
                       (select max(${ident(c)}) is not null from ${ident(t)}))`,
        [`public.${t}`, c],
      )
    }
  }

  // ---- Verificacion --------------------------------------------------------------------------
  if (aplicar) {
    const [uo, ud] = [usuarios.filter((u) => u.email).length, await contar(destino, 'user')]
    if (uo !== ud) {
      resultado.ok = false
      log(`  x usuarios: origen=${uo} destino=${ud}`)
    }
    for (const tabla of TABLAS) {
      if (!(await existeTabla(origen, tabla)) || !(await existeTabla(destino, tabla))) continue
      const enOrigen = new Set(await columnas(origen, tabla))
      const comunes = (await columnas(destino, tabla)).filter((c) => enOrigen.has(c))
      const [no, nd] = [await contar(origen, tabla), await contar(destino, tabla)]
      const [ho, hd] = [await checksum(origen, tabla, comunes), await checksum(destino, tabla, comunes)]
      const coincide = no === nd && ho === hd
      resultado.tablas[tabla] = { origen: no, destino: nd, coincide }
      if (!coincide) {
        resultado.ok = false
        log(`  x ${tabla}: origen=${no} destino=${nd} checksum ${ho === hd ? 'igual' : 'DISTINTO'}`)
      }
    }
    log(resultado.ok ? 'VERIFICACION OK: conteos y checksums coinciden en todas las tablas.' : 'VERIFICACION CON DIFERENCIAS (ver arriba).')
  }
  return resultado
}

// ---- CLI -------------------------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const { default: pg } = await import('pg')
  const [srcUrl, dstUrl] = [process.env.SOURCE_DATABASE_URL, process.env.DATABASE_URL]
  if (!srcUrl || !dstUrl) {
    console.error('Faltan SOURCE_DATABASE_URL (Supabase, solo lectura) y/o DATABASE_URL (base nueva).')
    process.exit(1)
  }
  if (srcUrl === dstUrl) {
    console.error('SOURCE_DATABASE_URL y DATABASE_URL no pueden ser la misma base.')
    process.exit(1)
  }
  const origen = new pg.Client({ connectionString: srcUrl })
  const destino = new pg.Client({ connectionString: dstUrl })
  await origen.connect()
  await destino.connect()
  try {
    const r = await importarDatos({ origen, destino, aplicar: process.argv.includes('--apply') })
    process.exit(r.ok ? 0 : 1)
  } finally {
    await origen.end()
    await destino.end()
  }
}
