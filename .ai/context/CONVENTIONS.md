# CONVENTIONS — VIMET (web)

Reglas FOS del proyecto + patrones observados en el código real (FACT salvo que se indique lo contrario).

## Reglas duras (romperlas rompe algo real, ya pasó antes)

- **Fechas**: siempre `lib/datetime.ts` (`hoyArgentina`, `horaArgentina`, `lunesDeSemanaArgentina`). Nunca `new Date().toISOString().slice(0,10)` para "hoy" — el server corre en UTC y esa expresión da la fecha de mañana después de las 21:00 en Córdoba. Aplica server y client.
- **Inputs numéricos decimales** (peso, pliegues ISAK, horas de sueño, etc.): `type="text" inputMode="decimal"` + validación server-side que reemplaza coma por punto. Nunca `type="number"` — el navegador vacía el campo en silencio (sin error visible) si el usuario tipea coma decimal, convención argentina. Los campos enteros (`step={1}`, sin riesgo de coma) no necesitan este tratamiento.
- **Dropdowns**: siempre `components/ui/select.tsx` (soporta controlado `value`+`onChange` y no controlado `defaultValue`+`name` con `<input type="hidden">` para `FormData`). Nunca un `<select>` nativo nuevo — el popup de un select nativo lo pinta el SO, sin CSS que lo alcance.
- **Redirects post-auth**: solo paths relativos internos o destinos fijos por rol; nunca `new URL(paramCrudo, origin)` (open redirect real, corregido una vez). Con Better Auth no hay callback con `next`.
- **Migraciones**: nunca editar una ya aplicada. Esquema nuevo: editar `db/schema.ts`, `npx drizzle-kit generate` (o `--custom` para SQL manual) y verificar con `npm run db:paridad`. `supabase/migrations/` queda solo como referencia hasta el corte.
- **`'use server'`**: el archivo solo exporta `*Action` y tipos; la lógica con `userId` va en `lib/services/*`.
- **Autorización**: toda consulta filtra por la sesión (`getSessionUser`/`requireStaff`), nunca por un `paciente_id` del cliente como autoridad; las escrituras clínicas van por `conActor`.
- **Tests**: `npm test` (Vitest + PGlite). Todo permiso nuevo lleva un test en `tests/*.authz.test.ts`.
- **`<svg>` con etiquetas de eje X de texto largo** (`category-line-chart.tsx`, `bar-chart.tsx`, `evolution-chart.tsx`): nunca rotarlas — un SVG clipea todo lo que cae fuera del `viewBox` en silencio. Usar wrap a 2 líneas.
- **Server Actions**: firma `(prevState, formData)` + `useActionState` de `react` (no `useFormState` de `react-dom`, removido en React 19).

## Patrones de estructura

- Server Components por defecto; `'use client'` solo donde hay interactividad real.
- Un módulo del área de seguimiento sigue el patrón: `lib/services/<modulo>.ts` (reglas) + `actions/<modulo>.ts` (`*Action` delgadas) + `components/seguimiento/<form>.tsx` + página admin correspondiente + (si aplica) página del área paciente.
- La lógica de negocio vive en `lib/services/<modulo>.ts` y la consumen la `*Action` web y la operación mobile (`lib/mobile/ops-*.ts`); no se reimplementa un chequeo de permisos en la capa mobile.
- Componente compartido `<Modal>` nunca desmonta a sus hijos (solo `showModal()`/`close()`) — cualquier form dentro de un modal que dependa de `defaultValue` necesita una `key` que cambie en cada apertura para forzar remount.

## Seguridad

- Sin RLS ni triggers de escalación: la protección de `rol`/`activo`, turnos ajenos y respuestas de feedback vive en los servicios (`cambiarActivo`, `puedeGestionarTurno`, `lib/services/feedback.ts`).
- Storage privado (`planes`, `recursos`): acceso solo vía URL firmada (`lib/storage/disk.ts`) generada tras verificar el permiso — nunca exponer paths directo al cliente.
- Headers de seguridad centralizados en `next.config.mjs` → `headers()`, no por ruta.

## Estilo

- Tailwind utility-only, sin styled-jsx.
- Fuentes vía `next/font` (Outfit headings, DM Sans body).
- `<Image>` con `sizes`; hero con `priority`.
- Paleta y tokens: ver `.claude/CLAUDE.md` sección "Diseño — Decisiones Clave" (no duplicado acá, es contenido de marca estable pero vive en la memoria de sesión por historial).
