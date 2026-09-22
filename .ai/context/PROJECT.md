# PROJECT — VIMET (web)

**Qué es (FACT):** app web para VIMET, un consultorio de nutrición + entrenamiento en Córdoba, Argentina (Avril Jerushalmi, nutricionista, e Gerónimo Gallardo, entrenador — atienden en Instituto VIANETT). Migración de un sitio PHP MVC + MySQL propio a Next.js + Supabase.

**Para quién (FACT):**
- **Pacientes**: reservan turnos, ven su ficha clínica, cargan feedback semanal, ven sus planes de nutrición/entrenamiento, su progreso (mediciones antropométricas, evaluación funcional), sus objetivos, y recursos multimedia que el staff les asigna.
- **Staff** (nutricionista/entrenador/admin): gestionan pacientes, cargan fichas/mediciones/evaluaciones/planes, responden feedback, editan contenido público del sitio (servicios, ubicación, metodología, perfil público propio o de cualquier otro profesional).
- **Visitantes públicos**: sitio institucional (home, nosotros, metodología, servicios, FAQ, contacto).

**Qué problema resuelve (FACT):** reemplaza un flujo manual/en papel de seguimiento nutricional y de entrenamiento por una plataforma donde el profesional carga datos clínicos estructurados (antropometría ISAK, evaluación funcional con score) y el paciente los consulta, además de digitalizar la reserva de turnos (incluyendo servicios "combo" que requieren coordinar nutricionista + entrenador al mismo tiempo).

**Repo hermano:** `../vimet-app` (Expo/React Native) — mismo backend de datos (Supabase), consumido parcialmente vía SDK directo y parcialmente vía las 15 rutas `app/api/mobile/*` de este repo. Ver `.ai/context/ARCHITECTURE.md` para el detalle de esa superficie dual.

**Estado:** en producción, sirviendo pacientes/staff reales desde `vimetsalud.com.ar` (self-hosted en Coolify). Ver `CURRENT_STATE.md` para qué está verificado end-to-end y qué no.

**Stakeholders (ASSUMPTION, no verificado en código, es contexto de negocio dado por el usuario):** Avril y Gero son los usuarios staff reales del sistema; CodeTlon (el usuario de esta sesión) es quien mantiene el código.
