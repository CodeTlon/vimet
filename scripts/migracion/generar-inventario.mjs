// Genera las secciones automaticas de docs/migracion/inventario.md
// (entre marcadores <!-- BEGIN:x --> / <!-- END:x -->). Todo lo que este fuera de
// los marcadores es manual y no se toca.
//
// Uso: node scripts/migracion/generar-inventario.mjs
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { clasificar, parsearPolicies } from './policies.mjs'

const raiz = process.cwd()
const destino = join(raiz, 'docs/migracion/inventario.md')

function reemplazar(doc, marca, contenido) {
  const re = new RegExp(`(<!-- BEGIN:${marca} -->)[\\s\\S]*?(<!-- END:${marca} -->)`)
  if (!re.test(doc)) throw new Error(`Falta el marcador ${marca} en inventario.md`)
  return doc.replace(re, `$1\n${contenido.trim()}\n$2`)
}

const celda = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
const corto = (s, n = 110) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s ?? '')

// ---- 1. Policies ----------------------------------------------------------
function seccionPolicies() {
  const r = parsearPolicies(join(raiz, 'supabase/migrations'))
  const filas = r.efectivas
    .map((p) => ({ p, c: clasificar(p) }))
    .sort((a, b) => a.p.tabla.localeCompare(b.p.tabla) || a.p.nombre.localeCompare(b.p.nombre))
  const porTipo = {}
  for (const { c } of filas) porTipo[c.tipo] = (porTipo[c.tipo] ?? 0) + 1

  const out = []
  out.push(
    `Sentencias \`create policy\` en \`supabase/migrations\`: **${r.sentenciasCreate}**. ` +
      `Vigentes tras aplicar todos los \`drop policy\`: **${r.efectivas.length}** ` +
      `(${r.creadasYBorradas.length} fueron reemplazadas por migraciones posteriores).`,
  )
  out.push('')
  out.push(
    'Resumen por tipo de guard: ' +
      Object.entries(porTipo)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · '),
  )
  out.push('')
  out.push(
    '> Guard y test IDOR son **sugeridos por heuristica** sobre la expresion SQL; hay que revisarlos uno por uno al implementar la Fase 4. ' +
      'La columna "Estado" se completa a mano (pendiente / guard hecho / test verde).',
  )
  out.push('')
  out.push('| # | Tabla / bucket | Policy | Op | Migracion | Expresion (resumida) | Guard server-side | Test IDOR | Estado |')
  out.push('|---|---|---|---|---|---|---|---|---|')
  filas.forEach(({ p, c }, i) => {
    const expr = [p.using && `USING ${p.using}`, p.check && `CHECK ${p.check}`].filter(Boolean).join(' / ')
    out.push(
      `| ${i + 1} | \`${celda(p.tabla)}\` | ${celda(p.nombre)} | ${p.op} | ${p.archivo.replace('.sql', '')} | ` +
        `\`${celda(corto(expr))}\` | ${celda(c.guard)} | ${celda(c.idor)} | pendiente |`,
    )
  })
  out.push('')
  out.push('Policies creadas y reemplazadas despues (ya no vigentes, solo informativo):')
  out.push('')
  for (const d of r.creadasYBorradas) out.push(`- \`${d.tabla}\` · ${d.nombre} (borrada en ${d.archivo.replace('.sql', '')})`)
  return out.join('\n')
}

// ---- 2. Huella de @supabase ----------------------------------------------
function archivosConSupabase() {
  const salida = execFileSync(
    'git',
    ['grep', '-l', '-E', '@supabase/|lib/supabase/', '--', '*.ts', '*.tsx', '*.mjs', '*.js', ':!node_modules'],
    { encoding: 'utf8' },
  )
  return salida.split('\n').filter(Boolean).sort()
}

function capaDe(archivo, src) {
  const capas = []
  if (/\.auth\.|auth\.admin|getUserAndProfile|requireAuth|requireStaff|requireAdmin|requireMobile|createServerClient|createBrowserClient/.test(src)) capas.push('auth')
  if (/storage\s*\.from\(|createSignedUrl|\.storage\b/.test(src)) capas.push('storage')
  if (/\.from\(\s*['"]\w+['"]\s*\)|\.rpc\(/.test(src)) capas.push('datos')
  if (capas.length === 0) capas.push('cliente/otros')
  return capas
}

function ubicacion(archivo) {
  if (archivo.startsWith('app/api/mobile/')) return 'api-mobile'
  if (archivo.startsWith('app/api/')) return 'api'
  if (archivo.startsWith('app/')) return 'app (paginas/rutas)'
  if (archivo.startsWith('actions/')) return 'actions'
  if (archivo.startsWith('components/')) return 'components'
  if (archivo.startsWith('lib/')) return 'lib'
  if (archivo.startsWith('e2e/')) return 'e2e'
  if (archivo.startsWith('scripts/')) return 'scripts'
  return 'raiz/otros'
}

function seccionHuella() {
  const archivos = archivosConSupabase()
  const tablas = new Map() // tabla -> {total, archivos:Set}
  const buckets = new Map()
  let dinamicos = 0
  let rpc = new Map()
  const porCapa = { auth: [], storage: [], datos: [], 'cliente/otros': [] }
  const porUbicacion = new Map()

  for (const f of archivos) {
    const src = readFileSync(join(raiz, f), 'utf8')
    for (const c of capaDe(f, src)) porCapa[c].push(f)
    const u = ubicacion(f)
    porUbicacion.set(u, (porUbicacion.get(u) ?? 0) + 1)

    const storagePos = new Set()
    for (const m of src.matchAll(/storage\s*\.from\(\s*['"]([\w-]+)['"]\s*\)/g)) {
      buckets.set(m[1], (buckets.get(m[1]) ?? 0) + 1)
      storagePos.add(m.index + m[0].indexOf('.from('))
    }
    for (const m of src.matchAll(/\.from\(\s*([^)]*?)\s*\)/g)) {
      const pos = m.index
      if (storagePos.has(pos)) continue
      if (/(Buffer|Array|Object|Promise|Set|Map)$/.test(src.slice(Math.max(0, pos - 8), pos))) continue
      if (/storage\s*$/.test(src.slice(Math.max(0, pos - 12), pos))) {
        dinamicos++ // storage.from(variable): bucket no literal
        continue
      }
      const lit = m[1].match(/^['"]([\w]+)['"]$/)
      if (!lit) {
        dinamicos++
        continue
      }
      const t = tablas.get(lit[1]) ?? { total: 0, archivos: new Set() }
      t.total++
      t.archivos.add(f)
      tablas.set(lit[1], t)
    }
    for (const m of src.matchAll(/\.rpc\(\s*['"]([\w]+)['"]/g)) rpc.set(m[1], (rpc.get(m[1]) ?? 0) + 1)
  }

  const totalFrom = [...tablas.values()].reduce((a, t) => a + t.total, 0)
  const out = []
  out.push(`Archivos de codigo que referencian \`@supabase/*\` o \`lib/supabase/*\`: **${archivos.length}**.`)
  out.push('')
  out.push('### Por ubicacion')
  out.push('')
  out.push('| Ubicacion | Archivos |')
  out.push('|---|---|')
  for (const [u, n] of [...porUbicacion].sort((a, b) => b[1] - a[1])) out.push(`| ${u} | ${n} |`)
  out.push('')
  out.push('### Por capa (un archivo puede estar en mas de una)')
  out.push('')
  for (const [capa, lista] of Object.entries(porCapa)) {
    out.push(`<details><summary><b>${capa}</b> (${lista.length})</summary>`)
    out.push('')
    for (const f of lista) out.push(`- \`${f}\``)
    out.push('')
    out.push('</details>')
    out.push('')
  }
  out.push('### Llamadas `.from()` a tablas')
  out.push('')
  out.push(
    `Total con tabla literal: **${totalFrom}** en ${new Set([...tablas.values()].flatMap((t) => [...t.archivos])).size} archivos` +
      (dinamicos ? ` (+ ${dinamicos} \`.from(<variable>)\` no resolubles estaticamente)` : '') +
      '.',
  )
  out.push('')
  out.push('| Tabla | `.from()` | Archivos |')
  out.push('|---|---|---|')
  for (const [t, v] of [...tablas].sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]))) {
    out.push(`| \`${t}\` | ${v.total} | ${v.archivos.size} |`)
  }
  out.push('')
  out.push('### Storage (`storage.from(<bucket>)`)')
  out.push('')
  out.push('| Bucket | Llamadas |')
  out.push('|---|---|')
  for (const [b, n] of [...buckets].sort((a, b) => b[1] - a[1])) out.push(`| \`${b}\` | ${n} |`)
  out.push('')
  if (rpc.size) {
    out.push('### Llamadas `.rpc()`')
    out.push('')
    for (const [n, c] of rpc) out.push(`- \`${n}\` x${c}`)
  }
  return out.join('\n')
}

let doc = readFileSync(destino, 'utf8')
doc = reemplazar(doc, 'policies', seccionPolicies())
doc = reemplazar(doc, 'huella', seccionHuella())
writeFileSync(destino, doc)
console.log('inventario.md actualizado')
