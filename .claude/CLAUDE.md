# VIMET — Project Context

> **Contexto de sesión para Claude Code.**
> Al iniciar: leer este archivo + TASKS.md. Ir directo al problema.
> Al finalizar: si hubo cambios estructurales → editar la sección correspondiente + agregar fila en Historial de Cambios.

---

## Identidad del Proyecto
- **Cliente:** VIMET — Vida y Metabolismo (Avril Jerushalmi + Gerónimo Gallardo)
- **Tipo:** L3 — Web app con auth + booking + dashboard admin (migración desde stack PHP MVC + MySQL)
- **Generado:** 2026-05-09
- **URL Producción:** pendiente
- **Repo GitHub:** CodeTlon/vimet
- **Deploy:** Vercel + Supabase

## Origen del proyecto
Migración desde sitio PHP MVC propio (en `client-assets/vimet/vimet/`) que corría sobre Laragon + MySQL. Ver `docs/migration-report.md` para mapeo legacy → nuevo stack.

## Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/UI, Lucide React
- Supabase: sí — tablas: `profiles`, `servicios`, `horarios_disponibles`, `turnos`, `bloqueos_horario`
- Resend: sí — solo formulario de contacto público (sin almacenamiento en DB)
- Fuentes: Outfit (headings) + DM Sans (body) — vía `next/font`

## Identidad de Marca
- **Brand:** VIMET — slogan "Nutrición y entrenamiento especializado en alteraciones metabólicas"
- **Ciudad:** Córdoba, Argentina (Instituto VIANETT, Av. Pedro Simón Laplace 5573)
- **Equipo:** Avril (nutricionista) + Gero (entrenador)

## Mapa de Archivos Clave
| Archivo | Rol |
|---------|-----|
| `app/layout.tsx` | Root layout — Navbar, Footer, fuentes, viewport |
| `app/page.tsx` | Home — Hero → Pilares → Servicios → Equipo → CTA → Ubicación |
| `app/nosotros/page.tsx` | Bio detallada de Avril + Gero |
| `app/metodologia/page.tsx` | Pasos + Pilares + ¿A quién va dirigido? |
| `app/servicios/page.tsx` | Catálogo de servicios por tipo (nutrición/entrenamiento/combo) |
| `app/faq/page.tsx` | 10 preguntas frecuentes con accordion |
| `app/contacto/page.tsx` | Form Resend + WhatsApp + ubicación con map |
| `app/login/page.tsx` | Login con Supabase Auth |
| `app/registro/page.tsx` | Registro paciente (signUp) |
| `app/(paciente)/mis-turnos/page.tsx` | Lista de turnos del paciente con cancelar |
| `app/(paciente)/turnos/nuevo/page.tsx` | Wizard reservar turno |
| `app/admin/dashboard/page.tsx` | KPIs + turnos hoy + próximos |
| `app/admin/calendario/page.tsx` | Vista mensual con turnos |
| `app/admin/turno/[id]/page.tsx` | Detalle + cambiar estado/notas |
| `app/admin/pacientes/page.tsx` | Listado de pacientes |
| `app/api/slots/route.ts` | GET slots disponibles (lo consume el wizard) |
| `components/navbar.tsx` | Navbar pública (transparente en home) |
| `components/footer.tsx` | Footer + CodeTlonBadge |
| `components/admin-sidebar.tsx` | Sidebar del admin |
| `lib/supabase/server.ts` | Cliente Supabase server-side |
| `lib/supabase/client.ts` | Cliente Supabase browser |
| `lib/supabase/middleware.ts` | Helper para refresh de session en middleware |
| `middleware.ts` | Auth middleware: protege /mis-turnos, /turnos/*, /admin/* |
| `actions/auth.ts` | Server Actions: login, register, logout |
| `actions/turnos.ts` | Server Actions: crear, cancelar, actualizar estado |
| `actions/contacto.ts` | Server Action: enviar email contacto |
| `supabase/migrations/0001_init.sql` | Schema inicial |
| `supabase/migrations/0002_seed.sql` | Seed servicios + horarios |
| `emails/contacto.tsx` | Template Resend del formulario contacto |

## Base de Datos (Supabase)
| Tabla | Campos relevantes | RLS |
|-------|-------------------|-----|
| `profiles` | id (=auth.users.id), nombre, apellido, telefono, rol | select propio + admin all |
| `servicios` | id, nombre, descripcion, duracion_minutos, tipo, icono, profesional_id | select público |
| `horarios_disponibles` | id, profesional_id, dia_semana, hora_inicio, hora_fin, modalidad | select público |
| `turnos` | id, paciente_id, profesional_id, servicio_id, fecha, hora_inicio, hora_fin, modalidad, estado, notas_paciente, notas_profesional | paciente ve sus propios + profesional ve los suyos + admin all |
| `bloqueos_horario` | id, profesional_id, fecha_inicio, fecha_fin, motivo | select público |

**Roles** (campo `rol` en `profiles`): `paciente` (default), `nutricionista`, `entrenador`, `admin`.
**Trigger:** `on_auth_user_created` → inserta fila en `profiles` con rol `paciente`.

## Variables de Entorno
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
COMPANY_EMAIL=
NEXT_PUBLIC_SITE_URL=
```
Ver `.env.example` para el listado completo.

## Diseño — Decisiones Clave
- **Paleta:**
  - primary `#E8611A` (vimet-orange)
  - accent `#C4391C` (vimet-red, deep)
  - dark `#1A1A1A`
  - gray-900 `#2D2D2D` · gray-700 `#4A4A4A` · gray-500 `#7A7A7A` · gray-300 `#B8B8B8` · gray-100 `#F0F0F0`
  - background `#FAFAFA` · cream `#FFF8F5`
  - gradient `linear-gradient(135deg, #E8611A, #C4391C)` para títulos destacados (`.text-gradient`)
- **Tipografía:** Outfit (headings, weights 400-800) / DM Sans (body, weights 400-700)
- **Border radius:** sm 6px / md 10px / lg 16px / xl 24px / full 9999px
- **Estilo general:** cálido, orgánico, confiable. Hero con imagen llena. Cards generosas. Image bands con título sobre imagen.
- **Iconos:** Lucide React. El proyecto legacy usa FontAwesome (fa-X), mapear cada ícono a su equivalente Lucide al migrar.

## Quirks y Advertencias
- Reglas FOS: Tailwind only (no styled-jsx), `useFormState` de `react-dom`, Server Actions con `(prevState, formData)`, fuentes via `next/font`, viewport separado de metadata, `<Image>` con `sizes`, hero con `priority`.
- Calendario admin: implementación nativa SSR (sin FullCalendar). El legacy usa una grilla simple de divs mes-by-mes con turnos del día.
- El wizard de reservar turno (`/turnos/nuevo`) hace fetch a `/api/slots` desde el cliente — implementar como Route Handler GET, no como Server Action.
- Servicios y horarios son data semi-estática (cambia rara vez) → se cargan server-side directo desde DB sin SWR.
- Telegram no está en el legacy. Notificaciones por email del booking → opcional vía Resend (se evalúa en FASE 6c).
- Map embed: el iframe del legacy apunta a un mapa genérico de Córdoba sin coordenadas exactas. Se mantiene igual.
- Schema MySQL → PostgreSQL: `INT AUTO_INCREMENT` → `BIGINT GENERATED ALWAYS AS IDENTITY`. `ENUM` → `CHECK` constraint o tipo enum nativo. `TINYINT(1)` → `BOOLEAN`. Foreign key a `auth.users` en `profiles.id`.

## Comandos Rápidos
```bash
npm run dev          # Dev server
npm run build        # Build producción
npm start            # Serve producción (para Lighthouse)
npx playwright test  # Tests E2E
```

## Historial de Cambios
| Fecha | Rama | Cambio |
|-------|------|--------|
| 2026-05-09 | dev | Bootstrap proyecto + repo CodeTlon/vimet + .claude/ |
