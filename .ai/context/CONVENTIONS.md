# CONVENTIONS — VIMET (web)

Reglas FOS del proyecto + patrones observados en el código real (FACT salvo que se indique lo contrario).

## Reglas duras (romperlas rompe algo real, ya pasó antes)

- **Fechas**: siempre `lib/datetime.ts` (`hoyArgentina`, `horaArgentina`, `lunesDeSemanaArgentina`). Nunca `new Date().toISOString().slice(0,10)` para "hoy" — el server corre en UTC y esa expresión da la fecha de mañana después de las 21:00 en Córdoba. Aplica server y client.
- **Inputs numéricos decimales** (peso, pliegues ISAK, horas de sueño, etc.): `type="text" inputMode="decimal"` + validación server-side que reemplaza coma por punto. Nunca `type="number"` — el navegador vacía el campo en silencio (sin error visible) si el usuario tipea coma decimal, convención argentina. Los campos enteros (`step={1}`, sin riesgo de coma) no necesitan este tratamiento.
- **Dropdowns**: siempre `components/ui/select.tsx` (soporta controlado `value`+`onChange` y no controlado `defaultValue`+`name` con `<input type="hidden">` para `FormData`). Nunca un `<select>` nativo nuevo — el popup de un select nativo lo pinta el SO, sin CSS que lo alcance.
- **Redirects post-auth con param `next`/`token`**: siempre por un allowlist de paths relativos (`safeNextPath` en `app/auth/callback/route.ts`). Nunca `new URL(paramCrudo, origin)` — un valor absoluto pisa el origin (open redirect real, ya corregido una vez).
- **Migraciones**: nunca editar una ya aplicada — crear una nueva numerada.
- **`<svg>` con etiquetas de eje X de texto largo** (`category-line-chart.tsx`, `bar-chart.tsx`, `evolution-chart.tsx`): nunca rotarlas — un SVG clipea todo lo que cae fuera del `viewBox` en silencio. Usar wrap a 2 líneas.
- **Server Actions**: firma `(prevState, formData)` + `useActionState` de `react` (no `useFormState` de `react-dom`, removido en React 19).

## Patrones de estructura

- Server Components por defecto; `'use client'` solo donde hay interactividad real.
- Un módulo del área de seguimiento sigue el patrón: `actions/<modulo>.ts` (Server Actions + función pelada reusable) + `components/seguimiento/<form>.tsx` + página admin correspondiente + (si aplica) página del área paciente.
- Cuando una ruta mobile necesita la misma lógica de negocio que una Server Action web, se extrae una función exportada sin el wrapper de validación/auth (ej. `crearTurno()` vs `crearTurnoAction()`) y ambas superficies la llaman — evita reimplementar el chequeo de permisos dos veces. Cuando no se sigue este patrón (una ruta mobile reimplementa su propio chequeo), hay que sincronizarlo a mano contra el equivalente web — fuente real de bugs pasados, ver `KNOWN_ISSUES.md`.
- Componente compartido `<Modal>` nunca desmonta a sus hijos (solo `showModal()`/`close()`) — cualquier form dentro de un modal que dependa de `defaultValue` necesita una `key` que cambie en cada apertura para forzar remount.

## Seguridad

- Triggers `BEFORE UPDATE` que bloquean auto-escalación (rol/activo, turnos ajenos, respuestas de feedback falsificadas) chequean `auth.uid() is null or is_staff()` — el `is null` es necesario porque `auth.uid()` es `null` bajo el cliente admin (service role). Un trigger nuevo sobre una tabla que recibe writes del cliente admin necesita ese mismo bypass, o rompe esa Server Action en silencio.
- Storage privado (`planes`, `recursos`): acceso solo vía signed URL generada por una Server Action que ya verificó el permiso — nunca exponer paths directo al cliente.
- Headers de seguridad centralizados en `next.config.mjs` → `headers()`, no por ruta.

## Estilo

- Tailwind utility-only, sin styled-jsx.
- Fuentes vía `next/font` (Outfit headings, DM Sans body).
- `<Image>` con `sizes`; hero con `priority`.
- Paleta y tokens: ver `.claude/CLAUDE.md` sección "Diseño — Decisiones Clave" (no duplicado acá, es contenido de marca estable pero vive en la memoria de sesión por historial).
