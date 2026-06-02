# Tasks — VIMET

## Setup
- [x] Repo GitHub `CodeTlon/vimet` + ramas main + dev pushed
- [x] `.claude/CLAUDE.md` + `.claude/settings.json`
- [x] `next.config.mjs` (formats avif/webp + deviceSizes + remotePatterns supabase)
- [x] `postcss.config.mjs`
- [x] `.browserslistrc`
- [x] `tailwind.config.ts` con paleta VIMET + fuentes
- [x] Identidad / `brand-config.json`
- [x] `sharp` + `lucide-react@^0.460` + `@supabase/ssr` + `@supabase/supabase-js` + `resend` + `react-hook-form` + `zod` + `@react-email/components`
- [x] `.env.example` con todas las vars
- [x] `lib/supabase/{server,client,middleware}.ts`
- [x] Imágenes copiadas a `public/images/`
- [x] `public/favicon.ico`

## Frontend Público
- [x] `app/layout.tsx` con next/font (Outfit + DM Sans), Navbar, Footer, viewport separado
- [x] `components/navbar.tsx` (transparente en home, sólido en otras, oculta en /admin /login /registro /turnos/nuevo)
- [x] `components/footer.tsx` con CodeTlonBadge (oculto en /admin /login /registro)
- [x] `components/whatsapp-fab.tsx` (oculto en /admin /login /registro)
- [x] `app/page.tsx` (Home: Hero → Pilares → Image band → Servicios → Image band → Equipo → CTA → Ubicación)
- [x] `app/nosotros/page.tsx` (bios Avril + Gero alternadas)
- [x] `app/metodologia/page.tsx` (Pasos + Pilares + Dirigido a)
- [x] `app/servicios/page.tsx` (catálogo por tipo, con fallback estático si DB vacía)
- [x] `app/faq/page.tsx` (accordion 10 FAQs)
- [x] `app/contacto/page.tsx` (form + WhatsApp + map)

## Auth
- [x] `actions/auth.ts` con login + register + logout
- [x] `app/login/page.tsx`
- [x] `app/registro/page.tsx`
- [x] `middleware.ts` protegiendo /mis-turnos, /turnos/*, /admin/*

## Booking Paciente
- [x] `app/(paciente)/mis-turnos/page.tsx`
- [x] `app/(paciente)/turnos/nuevo/page.tsx` (wizard)
- [x] `app/api/slots/route.ts` (GET disponibles)
- [x] Server Actions: crear turno (`actions/turnos.ts`), cancelar turno

## Admin
- [x] `app/admin/layout.tsx` (sidebar + auth gating staff)
- [x] `app/admin/dashboard/page.tsx`
- [x] `app/admin/calendario/page.tsx`
- [x] `app/admin/turno/[id]/page.tsx`
- [x] `app/admin/pacientes/page.tsx`
- [x] Server Action: `actualizarTurnoStaffAction` (estado + notas)

## Backend / Email / DB
- [x] `supabase/migrations/0001_init.sql` (5 tablas + enums + RLS + trigger handle_new_user)
- [x] `supabase/migrations/0002_seed.sql` (asigna roles + 7 servicios + 10 horarios)
- [x] `supabase/migrations/0003_seguimiento.sql` (7 tablas nuevas + RLS + bucket `planes`)
- [x] `actions/contacto.ts` con Zod + Resend
- [x] `emails/contacto.tsx` template profesional con paleta VIMET
- [x] `.env.example` listo

## Seguimiento Integral
- [x] Schema: `fichas_paciente`, `mediciones_antropometricas`, `evaluaciones_funcionales`, `planes`, `feedback_semanal`, `evolucion_entradas`, `objetivos` + bucket `planes`
- [x] Server actions: ficha, mediciones, evaluaciones, planes (con upload/signed URL), feedback (paciente + responder), evolución, objetivos
- [x] Admin paciente detalle con tabs: resumen, ficha, antropometría, eval funcional, planes (CRUD + PDF), feedback (responder dudas), evolución (visible/interno), objetivos
- [x] Área paciente: layout con subnav + `mi-ficha`, `mi-progreso` (gráficos), `mis-planes` (+ `[id]`), `feedback-semanal`, `mis-objetivos`
- [x] Componentes: `Tabs`, `EvolutionChart` (SVG nativo), `PacienteSubnav`, formularios de cada entidad, `PlanDownloadButton` con signed URL
- [x] Middleware actualizado con nuevas rutas paciente
- [x] Navbar: link "Mi espacio" para paciente autenticado
- [ ] Aplicar migration 0003 en Supabase (manual desde dashboard o CLI)
- [ ] Probar flujo end-to-end con un usuario paciente real

## Testing
- [x] `npm run build` pasa sin errores (17/17 páginas generadas)
- [x] Smoke test rutas públicas (200) y protegidas (307→/login)
- [ ] `npx playwright install`
- [ ] Tests E2E 3 viewports — golden path: home, nav, login, registro, booking, admin
- [ ] Lighthouse en producción

## Docs
- [ ] `README.md`
- [ ] `docs/deployment-guide.md`
- [ ] `docs/technical-docs.md`
- [ ] `docs/maintenance-guide.md`
- [ ] `docs/migration-report.md` (legacy → nuevo stack)

## Entrega
- [ ] Merge `dev` → `main` + tag `v1.0.0` + push
- [ ] Actualizar `.claude/CLAUDE.md` con URL producción tras deploy del usuario
