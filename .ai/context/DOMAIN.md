# DOMAIN — VIMET (web)

## Roles

`paciente` (default) · `nutricionista` · `entrenador` · `admin`. Desde las migraciones `0010`/`0032`, `admin` **no** es un nivel de permiso distinto para el contenido del sitio ni para editar el perfil público de otro profesional — cualquier `is_staff()` (nutricionista/entrenador/admin) puede hacer eso. `admin` sigue siendo el único que puede reasignar el `rol` de otro usuario (trigger dedicado).

Un paciente puede ser:
- **Auto-registrado**: se activa solo al confirmar su email (no requiere paso manual del staff desde la migración de activación automática).
- **"Gestionado" por staff** (`profiles.gestionado_por_staff`): para adultos mayores o pacientes sin acceso cómodo a la web — el staff lo da de alta desde el admin, con credenciales aleatorias que nunca se comunican; el paciente nunca inicia sesión, el staff opera todo por él.

## Turnos (booking)

Reserva de horarios de atención de un profesional. Un servicio puede ser `nutricion`, `entrenamiento` o `combo` (requiere nutricionista + entrenador al mismo tiempo — se modela como dos filas de `turnos` vinculadas por `turno_par_id`, y cancelar/reprogramar/actualizar una propaga a la otra). Slots se calculan en bloques de 15 minutos a partir de: horarios de atención del profesional − turnos ya tomados − bloqueos de agenda − filtro de "no antes de ahora" (zona horaria Argentina, no UTC). Un turno `pendiente` vencido más 15 minutos de gracia pasa a `no_asistio` mediante un barrido perezoso (no hay cron — corre cuando alguien visita una pantalla que lista turnos).

## Módulo de seguimiento clínico-nutricional

Un paciente tiene, a lo largo del tiempo:
- **Ficha clínica** (1:1): datos personales, hábitos, salud, laboratorio, motivos de consulta. Varios campos son datos clínicos sensibles y están cifrados a nivel de aplicación (ver `ARCHITECTURE.md`/`KNOWN_ISSUES.md`).
- **Mediciones antropométricas** (histórico): peso, talla, IMC, % grasa/músculo, y opcionalmente un protocolo ISAK completo (8 pliegues cutáneos, 3 perímetros, tejido muscular/óseo) que permite calcular IMO (índice músculo/óseo), Adiposidad (Σ6/Σ8 pliegues) y Muscularidad (perímetros corregidos) — fórmulas verificadas contra un software externo (ISAKmetry) que usa la nutricionista.
- **Evaluación funcional** (histórico): 8 tests con score ponderado, máximo 100 puntos (columna generada).
- **Planes** (nutrición/entrenamiento/combo): un PDF opcional + campos estructurados de entrenamiento (fijos) + rutina de ejercicios (fuerza o cardio, según el ejercicio del catálogo, no del plan) + **secciones modulares** que el profesional agrega a voluntad (pautas generales, receta, comidas del día con "momentos" de nombre libre, o imágenes) — reemplazó un bloque fijo de 6 columnas de texto.
- **Feedback semanal**: el paciente reporta estado físico/ánimo/energía/adherencias/peso una vez por semana; hay un chat (no un campo de "respuesta" simple) entre paciente y staff, que se cierra al terminar la semana en curso.
- **Evolución**: timeline de notas de staff, cada una marcada visible o no para el paciente.
- **Objetivos**: por categoría, con estado y fecha objetivo.
- **Recursos**: multimedia (link/PDF/imagen/video) que el staff asigna y marca visible o no.
- **Datos de wearable** (`mediciones_wearable`, consumido desde `../vimet-app`): pasos, calorías activas, frecuencia cardíaca, sueño — sincronizados desde el agregador del sistema operativo del paciente (Health Connect/Apple Health), no por marca de reloj individual.

## Reglas de negocio no evidentes en el schema (DECISION, ver `DECISIONS.md` para el porqué)

- "Datos de entrenamiento" (disciplina/frecuencia) y la rutina de ejercicios **no** son parte del sistema de secciones modulares — quedan fijos a propósito.
- Un ejercicio de cardio no usa series/reps/descanso — usa 3 fases (entrada en calor / trabajo principal / vuelta a la calma), cada una valor+unidad.
- El scope del cifrado clínico cubre `fichas_paciente`, `evolucion_entradas.contenido` y `planes.notas` — **no** cubre `plan_secciones` (el contenido real del plan de comidas/pautas queda en texto plano hoy).
