// Conteos de produccion en SOLO LECTURA via Management API de Supabase.
// Ejecuta unicamente SELECT sobre catalogos y conteos; no muta nada.
// Imprime solo cantidades (sin emails, ids ni valores de filas).
//
// Uso (el token lo pone quien corre el script, nunca se imprime):
//   SUPABASE_ACCESS_TOKEN=... node scripts/migracion/conteos-prod.mjs > conteos.md
// Para otro proyecto: SUPABASE_PROJECT_REF=<ref>. Por defecto, produccion.

const REF = process.env.SUPABASE_PROJECT_REF || 'ayjzcxvtylvsjacgjxgh'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) {
  console.error('Falta SUPABASE_ACCESS_TOKEN en el entorno.')
  process.exit(1)
}

async function sql(query) {
  if (!/^\s*select\b/i.test(query)) throw new Error('Solo se permiten SELECT')
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} en la consulta`)
  return res.json()
}

const tablas = await sql(
  `select c.relname as tabla, c.relrowsecurity as rls
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' order by 1`,
)

const filas = []
for (const t of tablas) {
  // El nombre sale de pg_class, no de input externo; igual se cita como identificador.
  const [{ n }] = await sql(`select count(*)::int as n from public."${t.tabla.replace(/"/g, '""')}"`)
  filas.push({ tabla: t.tabla, filas: n, rls: t.rls })
}

const [usuarios] = await sql(
  `select count(*)::int as total,
          count(*) filter (where email_confirmed_at is not null)::int as confirmados,
          count(*) filter (where invited_at is not null)::int as invitados,
          count(*) filter (where last_sign_in_at is not null)::int as con_login,
          count(*) filter (where email like '%@sinacceso.vimet.local')::int as sinteticos
     from auth.users`,
)
const proveedores = await sql(
  `select coalesce(raw_app_meta_data->>'provider', '(sin dato)') as proveedor, count(*)::int as n
     from auth.users group by 1 order by 2 desc`,
)
const hashes = await sql(
  `select case when encrypted_password is null or encrypted_password = '' then 'vacio'
               when encrypted_password like '$2%' then 'bcrypt' else 'otro' end as formato,
          count(*)::int as n
     from auth.users group by 1 order by 2 desc`,
)
const buckets = await sql(
  `select b.id as bucket, b.public as publico, count(o.id)::int as objetos,
          coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint as bytes
     from storage.buckets b left join storage.objects o on o.bucket_id = b.id
    group by 1, 2 order by 1`,
)
const roles = await sql(`select rol, count(*)::int as n from public.profiles group by 1 order by 2 desc`)
const mig = await sql(
  `select count(*)::int as n, max(version) as ultima from supabase_migrations.schema_migrations`,
)

// Auditoria: audit_log por accion/tabla y filas clinicas que siguen en texto plano.
const auditPorAccion = await sql(
  `select accion, tabla, count(*)::int as n, count(*) filter (where actor_id is null)::int as sin_actor
     from public.audit_log group by 1, 2 order by 1, 2`,
)
const pendientesCifrado = await sql(
  `select 'fichas_paciente' as tabla,
          count(*) filter (where (dx_medico is not null and dx_medico <> '' and dx_medico_enc is null)
                              or (dx_nutricional is not null and dx_nutricional <> '' and dx_nutricional_enc is null)
                              or (medicacion is not null and medicacion <> '' and medicacion_enc is null)
                              or (datos_laboratorio is not null and datos_laboratorio <> '' and datos_laboratorio_enc is null)
                              or (observaciones_internas is not null and observaciones_internas <> '' and observaciones_internas_enc is null))::int as texto_plano,
          count(*) filter (where dx_medico_enc is not null or dx_nutricional_enc is not null or medicacion_enc is not null
                              or datos_laboratorio_enc is not null or observaciones_internas_enc is not null)::int as cifradas,
          count(*)::int as total from public.fichas_paciente
   union all
   select 'evolucion_entradas',
          count(*) filter (where contenido is not null and contenido <> '' and contenido_enc is null)::int,
          count(*) filter (where contenido_enc is not null)::int, count(*)::int from public.evolucion_entradas
   union all
   select 'planes',
          count(*) filter (where notas is not null and notas <> '' and notas_enc is null)::int,
          count(*) filter (where notas_enc is not null)::int, count(*)::int from public.planes`,
)

const mb = (b) => (Number(b) / 1048576).toFixed(1)
console.log(`# Conteos de produccion (${REF}) - ${new Date().toISOString().slice(0, 10)}\n`)
console.log('Solo lectura. Cantidades, sin datos personales.\n')
console.log('## auth.users\n')
console.log('| Total | Email confirmado | Invitados | Con login alguna vez | Emails sinteticos (gestionados) |')
console.log('|---|---|---|---|---|')
console.log(`| ${usuarios.total} | ${usuarios.confirmados} | ${usuarios.invitados} | ${usuarios.con_login} | ${usuarios.sinteticos} |\n`)
console.log('Proveedor: ' + proveedores.map((p) => `${p.proveedor}=${p.n}`).join(', '))
console.log('Formato de hash: ' + hashes.map((h) => `${h.formato}=${h.n}`).join(', '))
console.log('Roles en profiles: ' + roles.map((r) => `${r.rol}=${r.n}`).join(', ') + '\n')
console.log('## Tablas de `public`\n')
console.log('| Tabla | Filas | RLS |')
console.log('|---|---|---|')
for (const f of filas) console.log(`| \`${f.tabla}\` | ${f.filas} | ${f.rls ? 'si' : 'NO'} |`)
console.log(`\nTotal de filas: ${filas.reduce((a, f) => a + f.filas, 0)}\n`)
console.log('## Buckets de Storage\n')
console.log('| Bucket | Publico | Objetos | MB |')
console.log('|---|---|---|---|')
for (const b of buckets) console.log(`| \`${b.bucket}\` | ${b.publico ? 'si' : 'no'} | ${b.objetos} | ${mb(b.bytes)} |`)
console.log(`\nMigraciones registradas en schema_migrations: ${mig[0].n} (ultima ${mig[0].ultima}); recordar que solo es confiable hasta 0018.`)
console.log('\n## audit_log\n')
console.log('| Accion | Tabla | Filas | Sin actor |')
console.log('|---|---|---|---|')
for (const a of auditPorAccion) console.log(`| ${a.accion} | \`${a.tabla}\` | ${a.n} | ${a.sin_actor} |`)
console.log('\n## Cifrado clinico (filas)\n')
console.log('| Tabla | Total | Con alguna columna cifrada | Con texto plano pendiente de backfill |')
console.log('|---|---|---|---|')
for (const c of pendientesCifrado) console.log(`| \`${c.tabla}\` | ${c.total} | ${c.cifradas} | ${c.texto_plano} |`)
