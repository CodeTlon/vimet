// Esquema de datos de VIMET (Postgres propio, Drizzle). Generado con `drizzle-kit pull` sobre el esquema final de
// supabase/migrations/0001-0039 (sin RLS, sin FK a auth.users) y ajustado a mano: columnas en snake_case para que las
// filas conserven la forma que hoy consume el codigo, y numeric como number (PostgREST devolvia numeros).
// Lo que Drizzle no modela (exclusion constraints, funciones, triggers) vive en drizzle/*.sql como migracion manual.
import { pgTable, index, foreignKey, bigint, text, integer, uuid, boolean, timestamp, check, smallint, time, date, jsonb, unique, numeric, uniqueIndex, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const categoriaObjetivo = pgEnum("categoria_objetivo", ['nutricional', 'antropometrico', 'clinico', 'entrenamiento', 'rendimiento'])
export const categoriaRecurso = pgEnum("categoria_recurso", ['ejercicio', 'nutricion', 'progreso', 'educativo', 'otro'])
export const estadoObjetivo = pgEnum("estado_objetivo", ['pendiente', 'en_progreso', 'cumplido', 'descartado'])
export const estadoPlan = pgEnum("estado_plan", ['vigente', 'archivado', 'borrador'])
export const estadoTurno = pgEnum("estado_turno", ['pendiente', 'confirmado', 'cancelado', 'completado', 'no_asistio', 'pendiente_reprogramacion'])
export const modalidadHorario = pgEnum("modalidad_horario", ['presencial', 'virtual', 'ambas'])
export const modalidadTurno = pgEnum("modalidad_turno", ['presencial', 'virtual'])
export const origenEvolucion = pgEnum("origen_evolucion", ['nutricion', 'entrenamiento'])
export const rolUsuario = pgEnum("rol_usuario", ['admin', 'nutricionista', 'entrenador', 'paciente'])
export const sexoPaciente = pgEnum("sexo_paciente", ['femenino', 'masculino', 'otro'])
export const tipoPlan = pgEnum("tipo_plan", ['nutricion', 'entrenamiento', 'combo'])
export const tipoRecurso = pgEnum("tipo_recurso", ['link', 'pdf', 'imagen', 'video'])
export const tipoSeccionPlan = pgEnum("tipo_seccion_plan", ['pautas_generales', 'receta', 'comidas_dia', 'imagenes'])
export const tipoServicio = pgEnum("tipo_servicio", ['nutricion', 'entrenamiento', 'combo'])


export const servicios = pgTable("servicios", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	nombre: text().notNull(),
	descripcion: text(),
	duracion_minutos: integer().default(60).notNull(),
	tipo: tipoServicio().notNull(),
	icono: text(),
	profesional_id: uuid(),
	activo: boolean().default(true).notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("servicios_profesional_idx").using("btree", table.profesional_id.asc().nullsLast()),
	index("servicios_tipo_idx").using("btree", table.tipo.asc().nullsLast()),
	foreignKey({
			columns: [table.profesional_id],
			foreignColumns: [profiles.id],
			name: "servicios_profesional_id_fkey"
		}).onDelete("set null"),
]);

export const horarios_disponibles = pgTable("horarios_disponibles", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	profesional_id: uuid().notNull(),
	dia_semana: smallint().notNull(),
	hora_inicio: time().notNull(),
	hora_fin: time().notNull(),
	modalidad: modalidadHorario().default('ambas').notNull(),
	activo: boolean().default(true).notNull(),
}, (table) => [
	index("horarios_prof_dia_idx").using("btree", table.profesional_id.asc().nullsLast(), table.dia_semana.asc().nullsLast()),
	foreignKey({
			columns: [table.profesional_id],
			foreignColumns: [profiles.id],
			name: "horarios_disponibles_profesional_id_fkey"
		}).onDelete("cascade"),
	check("horarios_disponibles_dia_semana_check", sql`(dia_semana >= 0) AND (dia_semana <= 6)`),
]);

export const evaluaciones_funcionales = pgTable("evaluaciones_funcionales", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	paciente_id: uuid().notNull(),
	fecha: date().default(sql`CURRENT_DATE`).notNull(),
	test_wells_adams: smallint(),
	test_thomas: smallint(),
	test_dorsiflexion: smallint(),
	test_sentadilla: smallint(),
	test_estabilidad: smallint(),
	fuerza_inferior: smallint(),
	fuerza_superior: smallint(),
	resistencia_metabolica: smallint(),
	puntaje_total: smallint().generatedAlwaysAs(sql`(((((((COALESCE((test_wells_adams)::integer, 0) + COALESCE((test_thomas)::integer, 0)) + COALESCE((test_dorsiflexion)::integer, 0)) + COALESCE((test_sentadilla)::integer, 0)) + COALESCE((test_estabilidad)::integer, 0)) + COALESCE((fuerza_inferior)::integer, 0)) + COALESCE((fuerza_superior)::integer, 0)) + COALESCE((resistencia_metabolica)::integer, 0))`),
	observaciones: text(),
	registrado_por: uuid(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("evals_paciente_idx").using("btree", table.paciente_id.asc().nullsLast(), table.fecha.desc().nullsFirst()),
	foreignKey({
			columns: [table.paciente_id],
			foreignColumns: [profiles.id],
			name: "evaluaciones_funcionales_paciente_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.registrado_por],
			foreignColumns: [profiles.id],
			name: "evaluaciones_funcionales_registrado_por_fkey"
		}).onDelete("set null"),
	check("evaluaciones_funcionales_test_wells_adams_check", sql`(test_wells_adams >= 0) AND (test_wells_adams <= 10)`),
	check("evaluaciones_funcionales_test_thomas_check", sql`(test_thomas >= 0) AND (test_thomas <= 10)`),
	check("evaluaciones_funcionales_test_dorsiflexion_check", sql`(test_dorsiflexion >= 0) AND (test_dorsiflexion <= 10)`),
	check("evaluaciones_funcionales_test_sentadilla_check", sql`(test_sentadilla >= 0) AND (test_sentadilla <= 10)`),
	check("evaluaciones_funcionales_test_estabilidad_check", sql`(test_estabilidad >= 0) AND (test_estabilidad <= 10)`),
	check("evaluaciones_funcionales_fuerza_inferior_check", sql`(fuerza_inferior >= 0) AND (fuerza_inferior <= 15)`),
	check("evaluaciones_funcionales_fuerza_superior_check", sql`(fuerza_superior >= 0) AND (fuerza_superior <= 15)`),
	check("evaluaciones_funcionales_resistencia_metabolica_check", sql`(resistencia_metabolica >= 0) AND (resistencia_metabolica <= 20)`),
]);

export const objetivos = pgTable("objetivos", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	paciente_id: uuid().notNull(),
	categoria: categoriaObjetivo().notNull(),
	descripcion: text().notNull(),
	estado: estadoObjetivo().default('pendiente').notNull(),
	fecha_objetivo: date(),
	registrado_por: uuid(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("objetivos_paciente_idx").using("btree", table.paciente_id.asc().nullsLast(), table.categoria.asc().nullsLast()),
	foreignKey({
			columns: [table.paciente_id],
			foreignColumns: [profiles.id],
			name: "objetivos_paciente_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.registrado_por],
			foreignColumns: [profiles.id],
			name: "objetivos_registrado_por_fkey"
		}).onDelete("set null"),
]);

export const contenido_sitio = pgTable("contenido_sitio", {
	id: integer().default(1).primaryKey().notNull(),
	direccion: text(),
	lugar: text(),
	ciudad: text(),
	map_embed_url: text(),
	email_contacto: text(),
	whatsapp_general: text(),
	instagram_handle: text(),
	instagram_url: text(),
	metodologia_pasos: jsonb().$type<unknown[]>().default([]).notNull(),
	metodologia_pilares: jsonb().$type<unknown[]>().default([]).notNull(),
	metodologia_dirigido_a: jsonb().$type<unknown[]>().default([]).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("contenido_sitio_singleton", sql`id = 1`),
]);

export const feedback_semanal = pgTable("feedback_semanal", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	paciente_id: uuid().notNull(),
	semana_inicio: date().notNull(),
	estado_fisico: smallint(),
	animo: smallint(),
	energia: smallint(),
	adherencia_entrenamiento: smallint(),
	adherencia_alimentacion: smallint(),
	peso_autoreporte_kg: numeric({ mode: "number", precision: 5, scale:  2 }),
	observaciones: text(),
	dudas: text(),
	respuesta_profesional: text(),
	respondido_por: uuid(),
	respondido_at: timestamp({ withTimezone: true, mode: 'string' }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	adjunto_path: text(),
}, (table) => [
	index("feedback_paciente_idx").using("btree", table.paciente_id.asc().nullsLast(), table.semana_inicio.desc().nullsFirst()),
	foreignKey({
			columns: [table.paciente_id],
			foreignColumns: [profiles.id],
			name: "feedback_semanal_paciente_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.respondido_por],
			foreignColumns: [profiles.id],
			name: "feedback_semanal_respondido_por_fkey"
		}).onDelete("set null"),
	unique("feedback_semanal_paciente_id_semana_inicio_key").on(table.paciente_id, table.semana_inicio),
	check("feedback_semanal_estado_fisico_check", sql`(estado_fisico >= 1) AND (estado_fisico <= 10)`),
	check("feedback_semanal_animo_check", sql`(animo >= 1) AND (animo <= 10)`),
	check("feedback_semanal_energia_check", sql`(energia >= 1) AND (energia <= 10)`),
	check("feedback_semanal_adherencia_entrenamiento_check", sql`(adherencia_entrenamiento >= 0) AND (adherencia_entrenamiento <= 100)`),
	check("feedback_semanal_adherencia_alimentacion_check", sql`(adherencia_alimentacion >= 0) AND (adherencia_alimentacion <= 100)`),
]);

export const recursos_paciente = pgTable("recursos_paciente", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	paciente_id: uuid().notNull(),
	tipo: tipoRecurso().notNull(),
	categoria: categoriaRecurso().default('otro').notNull(),
	titulo: text().notNull(),
	descripcion: text(),
	url: text(),
	storage_path: text(),
	visible_paciente: boolean().default(false).notNull(),
	plan_id: bigint({ mode: "number" }),
	creado_por: uuid(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("recursos_paciente_idx").using("btree", table.paciente_id.asc().nullsLast(), table.created_at.desc().nullsFirst()),
	foreignKey({
			columns: [table.paciente_id],
			foreignColumns: [profiles.id],
			name: "recursos_paciente_paciente_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.plan_id],
			foreignColumns: [planes.id],
			name: "recursos_paciente_plan_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.creado_por],
			foreignColumns: [profiles.id],
			name: "recursos_paciente_creado_por_fkey"
		}).onDelete("set null"),
	check("recursos_titulo_len", sql`(char_length(titulo) >= 1) AND (char_length(titulo) <= 200)`),
	check("recursos_url_o_path", sql`((tipo = 'link'::tipo_recurso) AND (url IS NOT NULL) AND (storage_path IS NULL)) OR ((tipo <> 'link'::tipo_recurso) AND (storage_path IS NOT NULL) AND (url IS NULL))`),
]);

export const feedback_mensajes = pgTable("feedback_mensajes", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	feedback_id: bigint({ mode: "number" }).notNull(),
	autor_id: uuid().notNull(),
	contenido: text().notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	edited_at: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("feedback_mensajes_feedback_idx").using("btree", table.feedback_id.asc().nullsLast(), table.id.asc().nullsLast()),
	foreignKey({
			columns: [table.feedback_id],
			foreignColumns: [feedback_semanal.id],
			name: "feedback_mensajes_feedback_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.autor_id],
			foreignColumns: [profiles.id],
			name: "feedback_mensajes_autor_id_fkey"
		}).onDelete("cascade"),
	check("feedback_mensajes_contenido_check", sql`(char_length(contenido) >= 1) AND (char_length(contenido) <= 2000)`),
]);

export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().notNull(),
	nombre: text().default('').notNull(),
	apellido: text().default('').notNull(),
	email: text(),
	telefono: text(),
	rol: rolUsuario().default('paciente').notNull(),
	activo: boolean().default(true).notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	titulo: text(),
	matricula: text(),
	foto_url: text(),
	instagram_handle: text(),
	instagram_url: text(),
	whatsapp_url: text(),
	bio_corta: text(),
	bio: text(),
	especialidades: text().array().default([]).notNull(),
	areas_trabajo: jsonb().$type<unknown[]>().default([]).notNull(),
	debe_cambiar_password: boolean().default(false).notNull(),
	activado_en: timestamp({ withTimezone: true, mode: 'string' }),
	gestionado_por_staff: boolean().default(false).notNull(),
	slot_publico: text(),
}, (table) => [
	index("profiles_activo_idx").using("btree", table.activo.asc().nullsLast()),
	index("profiles_rol_idx").using("btree", table.rol.asc().nullsLast()),
	uniqueIndex("profiles_slot_publico_unique").using("btree", table.slot_publico.asc().nullsLast()).where(sql`(slot_publico IS NOT NULL)`),
	check("profiles_slot_publico_check", sql`slot_publico = ANY (ARRAY['avril'::text, 'gero'::text])`),
]);

export const mediciones_wearable = pgTable("mediciones_wearable", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	paciente_id: uuid().notNull(),
	fecha: date().notNull(),
	pasos: integer(),
	calorias_activas: integer(),
	fc_prom: integer(),
	fc_min: integer(),
	fc_max: integer(),
	minutos_sueno: integer(),
	fuente: text().notNull(),
	sincronizado_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("mediciones_wearable_paciente_idx").using("btree", table.paciente_id.asc().nullsLast(), table.fecha.desc().nullsFirst()),
	foreignKey({
			columns: [table.paciente_id],
			foreignColumns: [profiles.id],
			name: "mediciones_wearable_paciente_id_fkey"
		}).onDelete("cascade"),
	unique("mediciones_wearable_paciente_fecha_fuente_unica").on(table.paciente_id, table.fecha, table.fuente),
	check("mediciones_wearable_fuente_valida", sql`fuente = ANY (ARRAY['health_connect'::text, 'apple_health'::text])`),
]);

export const sesiones_entrenamiento = pgTable("sesiones_entrenamiento", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	plan_id: bigint({ mode: "number" }).notNull(),
	paciente_id: uuid().notNull(),
	dia_semana: text(),
	fuente: text().default('manual').notNull(),
	iniciada_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	finalizada_at: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("sesiones_entrenamiento_paciente_idx").using("btree", table.paciente_id.asc().nullsLast(), table.iniciada_at.desc().nullsFirst()),
	foreignKey({
			columns: [table.plan_id],
			foreignColumns: [planes.id],
			name: "sesiones_entrenamiento_plan_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.paciente_id],
			foreignColumns: [profiles.id],
			name: "sesiones_entrenamiento_paciente_id_fkey"
		}).onDelete("cascade"),
	check("sesiones_entrenamiento_dia_valido", sql`(dia_semana IS NULL) OR (dia_semana = ANY (ARRAY['lunes'::text, 'martes'::text, 'miercoles'::text, 'jueves'::text, 'viernes'::text, 'sabado'::text, 'domingo'::text]))`),
	check("sesiones_entrenamiento_fuente_valida", sql`fuente = ANY (ARRAY['manual'::text, 'health_connect'::text, 'apple_health'::text])`),
]);

export const ejercicios = pgTable("ejercicios", {
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ startWith: 1000000 }),
	nombre: text().notNull(),
	categoria: text(),
	parte_cuerpo: text(),
	equipo: text(),
	musculo_principal: text(),
	musculos_secundarios: text().array().default([]).notNull(),
	instrucciones: text(),
	imagen_url: text(),
	gif_url: text(),
	atribucion: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	origen: text().default('dataset').notNull(),
	creado_por: uuid(),
	youtube_url: text(),
	modo: text().default('fuerza').notNull(),
}, (table) => [
	index("ejercicios_equipo_idx").using("btree", table.equipo.asc().nullsLast()),
	index("ejercicios_modo_idx").using("btree", table.modo.asc().nullsLast()),
	index("ejercicios_origen_idx").using("btree", table.origen.asc().nullsLast()),
	index("ejercicios_parte_cuerpo_idx").using("btree", table.parte_cuerpo.asc().nullsLast()),
	foreignKey({
			columns: [table.creado_por],
			foreignColumns: [profiles.id],
			name: "ejercicios_creado_por_fkey"
		}).onDelete("set null"),
	check("ejercicios_origen_check", sql`origen = ANY (ARRAY['dataset'::text, 'staff'::text])`),
	check("ejercicios_media_check", sql`(origen <> 'staff'::text) OR ((gif_url IS NOT NULL) <> (youtube_url IS NOT NULL))`),
	check("ejercicios_modo_check", sql`modo = ANY (ARRAY['fuerza'::text, 'cardio'::text])`),
]);

export const sets_completados = pgTable("sets_completados", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	sesion_id: bigint({ mode: "number" }).notNull(),
	plan_ejercicio_id: bigint({ mode: "number" }).notNull(),
	numero_set: integer().notNull(),
	peso_kg: numeric({ mode: "number" }),
	repeticiones: text(),
	duracion_seg: integer(),
	descanso_seg: integer(),
	completado_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("sets_completados_sesion_idx").using("btree", table.sesion_id.asc().nullsLast()),
	foreignKey({
			columns: [table.sesion_id],
			foreignColumns: [sesiones_entrenamiento.id],
			name: "sets_completados_sesion_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.plan_ejercicio_id],
			foreignColumns: [plan_ejercicios.id],
			name: "sets_completados_plan_ejercicio_id_fkey"
		}).onDelete("cascade"),
]);

export const plan_ejercicios = pgTable("plan_ejercicios", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	plan_id: bigint({ mode: "number" }).notNull(),
	ejercicio_id: bigint({ mode: "number" }).notNull(),
	dia_semana: text(),
	orden: integer().default(0).notNull(),
	series: integer(),
	repeticiones: text(),
	descanso_seg: integer(),
	notas: text(),
	cardio_entrada_calor_valor: numeric({ mode: "number" }),
	cardio_entrada_calor_unidad: text(),
	cardio_trabajo_principal_valor: numeric({ mode: "number" }),
	cardio_trabajo_principal_unidad: text(),
	cardio_vuelta_calma_valor: numeric({ mode: "number" }),
	cardio_vuelta_calma_unidad: text(),
}, (table) => [
	index("plan_ejercicios_plan_idx").using("btree", table.plan_id.asc().nullsLast(), table.dia_semana.asc().nullsLast(), table.orden.asc().nullsLast()),
	foreignKey({
			columns: [table.plan_id],
			foreignColumns: [planes.id],
			name: "plan_ejercicios_plan_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.ejercicio_id],
			foreignColumns: [ejercicios.id],
			name: "plan_ejercicios_ejercicio_id_fkey"
		}).onDelete("restrict"),
	check("plan_ejercicios_dia_valido", sql`(dia_semana IS NULL) OR (dia_semana = ANY (ARRAY['lunes'::text, 'martes'::text, 'miercoles'::text, 'jueves'::text, 'viernes'::text, 'sabado'::text, 'domingo'::text]))`),
	check("plan_ejercicios_cardio_unidad_valida", sql`((cardio_entrada_calor_unidad IS NULL) OR (cardio_entrada_calor_unidad = ANY (ARRAY['minutos'::text, 'horas'::text, 'km'::text]))) AND ((cardio_trabajo_principal_unidad IS NULL) OR (cardio_trabajo_principal_unidad = ANY (ARRAY['minutos'::text, 'horas'::text, 'km'::text]))) AND ((cardio_vuelta_calma_unidad IS NULL) OR (cardio_vuelta_calma_unidad = ANY (ARRAY['minutos'::text, 'horas'::text, 'km'::text])))`),
	check("plan_ejercicios_cardio_pares_completos", sql`((cardio_entrada_calor_valor IS NULL) = (cardio_entrada_calor_unidad IS NULL)) AND ((cardio_trabajo_principal_valor IS NULL) = (cardio_trabajo_principal_unidad IS NULL)) AND ((cardio_vuelta_calma_valor IS NULL) = (cardio_vuelta_calma_unidad IS NULL))`),
	check("plan_ejercicios_cardio_valor_positivo", sql`((cardio_entrada_calor_valor IS NULL) OR (cardio_entrada_calor_valor > (0)::numeric)) AND ((cardio_trabajo_principal_valor IS NULL) OR (cardio_trabajo_principal_valor > (0)::numeric)) AND ((cardio_vuelta_calma_valor IS NULL) OR (cardio_vuelta_calma_valor > (0)::numeric))`),
]);

export const turnos = pgTable("turnos", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	paciente_id: uuid().notNull(),
	profesional_id: uuid().notNull(),
	servicio_id: bigint({ mode: "number" }),
	fecha: date().notNull(),
	hora_inicio: time().notNull(),
	hora_fin: time().notNull(),
	modalidad: modalidadTurno().default('presencial').notNull(),
	estado: estadoTurno().default('pendiente').notNull(),
	notas_paciente: text(),
	notas_profesional: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	turno_par_id: bigint({ mode: "number" }),
	motivo_cancelacion: text(),
	motivo_reprogramacion: text(),
}, (table) => [
	index("turnos_estado_idx").using("btree", table.estado.asc().nullsLast()),
	index("turnos_paciente_idx").using("btree", table.paciente_id.asc().nullsLast()),
	index("turnos_profesional_fecha_idx").using("btree", table.profesional_id.asc().nullsLast(), table.fecha.asc().nullsLast()),
	index("turnos_turno_par_idx").using("btree", table.turno_par_id.asc().nullsLast()),
	foreignKey({
			columns: [table.paciente_id],
			foreignColumns: [profiles.id],
			name: "turnos_paciente_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.profesional_id],
			foreignColumns: [profiles.id],
			name: "turnos_profesional_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.servicio_id],
			foreignColumns: [servicios.id],
			name: "turnos_servicio_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.turno_par_id],
			foreignColumns: [table.id],
			name: "turnos_turno_par_id_fkey"
		}).onDelete("set null"),
]);

export const bloqueos_horario = pgTable("bloqueos_horario", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	profesional_id: uuid().notNull(),
	fecha_inicio: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	fecha_fin: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	motivo: text(),
}, (table) => [
	index("bloqueos_profesional_idx").using("btree", table.profesional_id.asc().nullsLast()),
	foreignKey({
			columns: [table.profesional_id],
			foreignColumns: [profiles.id],
			name: "bloqueos_horario_profesional_id_fkey"
		}).onDelete("cascade"),
]);

export const fichas_paciente = pgTable("fichas_paciente", {
	paciente_id: uuid().primaryKey().notNull(),
	fecha_nacimiento: date(),
	sexo: sexoPaciente(),
	ocupacion: text(),
	fecha_primera_consulta: date(),
	fuma: boolean(),
	bebe: boolean(),
	drogas: boolean(),
	entrena: boolean(),
	actividad_diaria: text(),
	horas_sueno: numeric({ mode: "number", precision: 3, scale:  1 }),
	dx_medico: text(),
	dx_nutricional: text(),
	medicacion: text(),
	suplementacion: text(),
	lesiones: text(),
	molestias: text(),
	datos_laboratorio: text(),
	motivos_consulta: text(),
	observaciones_internas: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_by: uuid(),
	dx_medico_enc: text(),
	dx_nutricional_enc: text(),
	medicacion_enc: text(),
	datos_laboratorio_enc: text(),
	observaciones_internas_enc: text(),
}, (table) => [
	index("fichas_updated_idx").using("btree", table.updated_at.desc().nullsFirst()),
	foreignKey({
			columns: [table.paciente_id],
			foreignColumns: [profiles.id],
			name: "fichas_paciente_paciente_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.updated_by],
			foreignColumns: [profiles.id],
			name: "fichas_paciente_updated_by_fkey"
		}).onDelete("set null"),
]);

export const plan_secciones = pgTable("plan_secciones", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	plan_id: bigint({ mode: "number" }).notNull(),
	tipo: tipoSeccionPlan().notNull(),
	titulo: text().notNull(),
	contenido: text(),
	orden: integer().default(0).notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("plan_secciones_plan_idx").using("btree", table.plan_id.asc().nullsLast(), table.orden.asc().nullsLast()),
	foreignKey({
			columns: [table.plan_id],
			foreignColumns: [planes.id],
			name: "plan_secciones_plan_id_fkey"
		}).onDelete("cascade"),
]);

export const mediciones_antropometricas = pgTable("mediciones_antropometricas", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	paciente_id: uuid().notNull(),
	fecha_medicion: date().default(sql`CURRENT_DATE`).notNull(),
	peso_kg: numeric({ mode: "number", precision: 5, scale:  2 }),
	talla_cm: numeric({ mode: "number", precision: 5, scale:  2 }),
	imc: numeric({ mode: "number", precision: 5, scale:  2 }),
	porc_grasa: numeric({ mode: "number", precision: 5, scale:  2 }),
	porc_masa_muscular: numeric({ mode: "number", precision: 5, scale:  2 }),
	kg_grasa: numeric({ mode: "number", precision: 5, scale:  2 }),
	kg_musculo: numeric({ mode: "number", precision: 5, scale:  2 }),
	dx_antropometrico: text(),
	observaciones: text(),
	registrado_por: uuid(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	pliegue_triceps_mm: numeric({ mode: "number", precision: 4, scale:  1 }),
	pliegue_subescapular_mm: numeric({ mode: "number", precision: 4, scale:  1 }),
	pliegue_supraespinal_mm: numeric({ mode: "number", precision: 4, scale:  1 }),
	pliegue_abdominal_mm: numeric({ mode: "number", precision: 4, scale:  1 }),
	pliegue_muslo_mm: numeric({ mode: "number", precision: 4, scale:  1 }),
	pliegue_pierna_mm: numeric({ mode: "number", precision: 4, scale:  1 }),
	pliegue_biceps_mm: numeric({ mode: "number", precision: 4, scale:  1 }),
	pliegue_cresta_iliaca_mm: numeric({ mode: "number", precision: 4, scale:  1 }),
	perimetro_brazo_cm: numeric({ mode: "number", precision: 5, scale:  2 }),
	perimetro_muslo_cm: numeric({ mode: "number", precision: 5, scale:  2 }),
	perimetro_pierna_cm: numeric({ mode: "number", precision: 5, scale:  2 }),
	kg_tejido_muscular: numeric({ mode: "number", precision: 5, scale:  2 }),
	kg_tejido_oseo: numeric({ mode: "number", precision: 5, scale:  2 }),
}, (table) => [
	index("mediciones_paciente_idx").using("btree", table.paciente_id.asc().nullsLast(), table.fecha_medicion.desc().nullsFirst()),
	foreignKey({
			columns: [table.paciente_id],
			foreignColumns: [profiles.id],
			name: "mediciones_antropometricas_paciente_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.registrado_por],
			foreignColumns: [profiles.id],
			name: "mediciones_antropometricas_registrado_por_fkey"
		}).onDelete("set null"),
]);

export const plan_seccion_comidas = pgTable("plan_seccion_comidas", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	seccion_id: bigint({ mode: "number" }).notNull(),
	nombre_momento: text().notNull(),
	contenido: text().notNull(),
	orden: integer().default(0).notNull(),
}, (table) => [
	index("plan_seccion_comidas_seccion_idx").using("btree", table.seccion_id.asc().nullsLast(), table.orden.asc().nullsLast()),
	foreignKey({
			columns: [table.seccion_id],
			foreignColumns: [plan_secciones.id],
			name: "plan_seccion_comidas_seccion_id_fkey"
		}).onDelete("cascade"),
]);

export const plan_seccion_imagenes = pgTable("plan_seccion_imagenes", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	seccion_id: bigint({ mode: "number" }).notNull(),
	storage_path: text().notNull(),
	orden: integer().default(0).notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("plan_seccion_imagenes_seccion_idx").using("btree", table.seccion_id.asc().nullsLast(), table.orden.asc().nullsLast()),
	foreignKey({
			columns: [table.seccion_id],
			foreignColumns: [plan_secciones.id],
			name: "plan_seccion_imagenes_seccion_id_fkey"
		}).onDelete("cascade"),
]);

export const evolucion_entradas = pgTable("evolucion_entradas", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	paciente_id: uuid().notNull(),
	origen: origenEvolucion().notNull(),
	tipo: text().notNull(),
	contenido: text(),
	visible_paciente: boolean().default(false).notNull(),
	registrado_por: uuid(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	contenido_enc: text(),
}, (table) => [
	index("evolucion_paciente_idx").using("btree", table.paciente_id.asc().nullsLast(), table.created_at.desc().nullsFirst()),
	foreignKey({
			columns: [table.paciente_id],
			foreignColumns: [profiles.id],
			name: "evolucion_entradas_paciente_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.registrado_por],
			foreignColumns: [profiles.id],
			name: "evolucion_entradas_registrado_por_fkey"
		}).onDelete("set null"),
	check("evolucion_entradas_tipo_check", sql`tipo = ANY (ARRAY['evolucion'::text, 'observacion'::text])`),
]);

export const planes = pgTable("planes", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	paciente_id: uuid().notNull(),
	profesional_id: uuid(),
	tipo: tipoPlan().notNull(),
	titulo: text().notNull(),
	estado: estadoPlan().default('vigente').notNull(),
	fecha_desde: date().default(sql`CURRENT_DATE`).notNull(),
	fecha_hasta: date(),
	archivo_path: text(),
	disciplina: text(),
	experiencia_previa: text(),
	frecuencia: text(),
	volumen: text(),
	disponibilidad_lunes: text(),
	disponibilidad_martes: text(),
	disponibilidad_miercoles: text(),
	disponibilidad_jueves: text(),
	disponibilidad_viernes: text(),
	disponibilidad_sabado: text(),
	notas: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	dias_descanso: text().array().default([]).notNull(),
	notas_enc: text(),
}, (table) => [
	index("planes_paciente_tipo_idx").using("btree", table.paciente_id.asc().nullsLast(), table.tipo.asc().nullsLast(), table.estado.asc().nullsLast()),
	foreignKey({
			columns: [table.paciente_id],
			foreignColumns: [profiles.id],
			name: "planes_paciente_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.profesional_id],
			foreignColumns: [profiles.id],
			name: "planes_profesional_id_fkey"
		}).onDelete("set null"),
	check("planes_dias_descanso_check", sql`dias_descanso <@ ARRAY['lunes'::text, 'martes'::text, 'miercoles'::text, 'jueves'::text, 'viernes'::text, 'sabado'::text, 'domingo'::text]`),
]);

export const audit_log = pgTable("audit_log", {
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	paciente_id: uuid(),
	actor_id: uuid(),
	accion: text().notNull(),
	tabla: text().notNull(),
	registro_id: text(),
	metadata: jsonb().$type<Record<string, unknown>>(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("audit_log_actor_idx").using("btree", table.actor_id.asc().nullsLast(), table.created_at.desc().nullsFirst()),
	index("audit_log_paciente_idx").using("btree", table.paciente_id.asc().nullsLast(), table.created_at.desc().nullsFirst()),
	index("audit_log_tabla_idx").using("btree", table.tabla.asc().nullsLast(), table.created_at.desc().nullsFirst()),
	// Sin FK a `profiles` a proposito (diferencia con Supabase): el rastro de auditoria debe
	// sobrevivir al borrado del paciente o del actor. Con FK, el trigger de borrado en cascada
	// intentaba insertar una fila que apuntaba al perfil que se estaba eliminando y abortaba
	// el DELETE (ver tests/eliminar-paciente.test.ts).
	check("audit_log_accion_check", sql`accion = ANY (ARRAY['insert'::text, 'update'::text, 'delete'::text, 'ver'::text])`),
]);

// ---------------------------------------------------------------------------
// Better Auth (user / session / account / verification). Los ids son uuid y
// `user.id` es el mismo uuid que `profiles.id` (se conserva el de auth.users de
// Supabase al importar). Las claves van en camelCase porque asi las espera el
// adaptador de Drizzle; las tablas de negocio de arriba usan snake_case.
// ---------------------------------------------------------------------------
export const user = pgTable("user", {
	id: uuid().primaryKey().defaultRandom(),
	name: text().notNull(),
	email: text().notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const session = pgTable("session", {
	id: uuid().primaryKey().defaultRandom(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	token: text().notNull().unique(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => [index("session_user_id_idx").on(table.userId)]);

export const account = pgTable("account", {
	id: uuid().primaryKey().defaultRandom(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("account_user_id_idx").on(table.userId)]);

export const verification = pgTable("verification", {
	id: uuid().primaryKey().defaultRandom(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("verification_identifier_idx").on(table.identifier)]);
