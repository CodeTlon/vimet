// Definición del dataset demo — 10 pacientes con 3-6 meses de historial.
// Este archivo es solo datos (sin llamadas a Supabase): revisalo/editalo acá
// antes de correr scripts/seed-demo-pacientes.mjs, que es el que lo aplica.
//
// Todas las fechas van como offsets en días relativos a "hoy" (negativo =
// pasado, positivo = futuro), resueltos recién al ejecutar el seed — así el
// dataset sigue siendo coherente sin importar cuándo se corra.
//
// Distribución: 3 solo nutrición (P1-P3) / 3 solo entrenamiento (P4-P6) / 4
// combo (P7-P10). Nivel de desarrollo cruzado con el tipo de servicio:
// A = con historial largo y buena evolución, B = con historial largo pero
// irregular/estancado, C = paciente recién llegado.

export const DEMO_PASSWORD = 'DemoVimet#2026'
export const DEMO_EMAIL_DOMAIN = '@vimet.test'

export const PACIENTES = [
  // ───────────────────────────── Nutrición ─────────────────────────────
  {
    nombre: 'María Fernanda',
    apellido: 'Acosta',
    email: 'maria.acosta@vimet.test',
    telefono: '3515550001',
    sexo: 'femenino',
    fechaNacimiento: '1992-03-14',
    ocupacion: 'Diseñadora gráfica',
    servicio: 'nutricion',
    nivel: 'A',
    antiguedadDias: 182,
    ficha: {
      fuma: false, bebe: true, drogas: false, entrena: false,
      actividadDiaria: 'normal', horasSueno: 6.5,
      dxMedico: null,
      dxNutricional: 'Sobrepeso grado I',
      medicacion: null,
      suplementacion: null,
      lesiones: null,
      molestias: 'Cansancio frecuente por las tardes',
      datosLaboratorio: 'Colesterol total 210 mg/dl, resto dentro de rango (informe previo).',
      motivosConsulta: 'Bajar de peso de forma sostenida y mejorar hábitos alimentarios.',
      observacionesInternas: 'Buena adherencia desde el inicio, responde bien a los ajustes.',
    },
    mediciones: [
      { diasAtras: 182, pesoKg: 78.5, tallaCm: 165, porcGrasa: 34.0, porcMasaMuscular: 30.0, kgGrasa: 26.7, kgMusculo: 23.6, dx: 'Sobrepeso leve, inicio de plan', observaciones: 'Primera consulta.' },
      { diasAtras: 150, pesoKg: 76.2, tallaCm: 165, porcGrasa: 32.0, porcMasaMuscular: 30.5, kgGrasa: 24.4, kgMusculo: 23.2 },
      { diasAtras: 120, pesoKg: 74.0, tallaCm: 165, porcGrasa: 29.5, porcMasaMuscular: 31.0, kgGrasa: 21.8, kgMusculo: 22.9 },
      { diasAtras: 90, pesoKg: 71.8, tallaCm: 165, porcGrasa: 27.0, porcMasaMuscular: 31.5, kgGrasa: 19.4, kgMusculo: 22.6 },
      { diasAtras: 45, pesoKg: 69.5, tallaCm: 165, porcGrasa: 25.0, porcMasaMuscular: 32.0, kgGrasa: 17.4, kgMusculo: 22.2 },
      { diasAtras: 10, pesoKg: 67.9, tallaCm: 165, porcGrasa: 23.5, porcMasaMuscular: 32.3, kgGrasa: 16.0, kgMusculo: 21.9, dx: 'Buena evolución, dentro de objetivo', observaciones: 'Sostiene el plan sin dificultad.' },
    ],
    planes: [
      {
        diasDesde: 180, diasHasta: 88, estado: 'archivado', titulo: 'Plan nutricional inicial',
        nutri: {
          pautasGenerales: 'Plan hipocalórico moderado, 4 comidas diarias, foco en proteína magra y vegetales.',
          pautasHidratacion: '2.5L de agua por día, evitar bebidas azucaradas.',
          suplementacion: 'Multivitamínico diario.',
        },
      },
      {
        diasDesde: 85, estado: 'vigente', titulo: 'Plan nutricional — ajuste tras -8kg',
        nutri: {
          pautasGenerales: 'Ajuste de plan tras buena adherencia: se suman carbohidratos post-entreno y una colación extra.',
          pautasHidratacion: '2.5L de agua por día.',
          suplementacion: 'Multivitamínico diario.',
        },
      },
    ],
    turnos: [
      { diasOffset: -175, tipo: 'nutricion', servicio: 'Consulta Inicial', estado: 'completado' },
      { diasOffset: -140, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'completado' },
      { diasOffset: -100, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'completado' },
      { diasOffset: -60, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'completado' },
      { diasOffset: -20, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'completado' },
      { diasOffset: 5, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'pendiente' },
    ],
    objetivos: [
      { categoria: 'nutricional', descripcion: 'Reducir 8kg de peso corporal', estado: 'cumplido', diasObjetivo: -20 },
      { categoria: 'antropometrico', descripcion: 'Bajar % de grasa corporal a 22%', estado: 'en_progreso', diasObjetivo: 30 },
      { categoria: 'clinico', descripcion: 'Normalizar perfil lipídico en próximo análisis', estado: 'pendiente', diasObjetivo: 60 },
    ],
    feedback: [
      { semanasAtras: 20 }, { semanasAtras: 16 }, { semanasAtras: 12 },
      { semanasAtras: 9 }, { semanasAtras: 6 }, { semanasAtras: 4, conMensaje: true },
      { semanasAtras: 2, conMensaje: true }, { semanasAtras: 0, conMensaje: true },
    ],
    evolucion: [
      { diasAtras: 150, origen: 'nutricion', tipo: 'evolucion', contenido: 'Bajó 2.3kg en el primer mes, buena adaptación al plan.', visible: true },
      { diasAtras: 90, origen: 'nutricion', tipo: 'evolucion', contenido: 'Sostiene la adherencia, empieza a notar más energía en el día.', visible: true },
      { diasAtras: 20, origen: 'nutricion', tipo: 'observacion', contenido: 'Evaluar mantenimiento una vez alcanzado el objetivo de peso.', visible: false },
    ],
  },
  {
    nombre: 'Jorge Luis',
    apellido: 'Benítez',
    email: 'jorge.benitez@vimet.test',
    telefono: '3515550002',
    sexo: 'masculino',
    fechaNacimiento: '1974-08-02',
    ocupacion: 'Contador',
    servicio: 'nutricion',
    nivel: 'B',
    antiguedadDias: 150,
    ficha: {
      fuma: true, bebe: true, drogas: false, entrena: false,
      actividadDiaria: 'poca', horasSueno: 5.5,
      dxMedico: 'Hipertensión controlada con medicación',
      dxNutricional: 'Sobrepeso grado II',
      medicacion: 'Enalapril 10mg',
      suplementacion: null,
      lesiones: null,
      molestias: 'Reflujo ocasional',
      datosLaboratorio: 'Glucemia en ayunas 105 mg/dl (límite alto).',
      motivosConsulta: 'Indicación médica por hipertensión y sobrepeso.',
      observacionesInternas: 'Le cuesta sostener el plan fuera de los fines de semana, evaluar cambio de estrategia.',
    },
    mediciones: [
      { diasAtras: 145, pesoKg: 88.0, tallaCm: 178, porcGrasa: 29.0, porcMasaMuscular: 32.0, kgGrasa: 25.5, kgMusculo: 28.2, dx: 'Sobrepeso grado II', observaciones: 'Primera consulta, deriva médica.' },
      { diasAtras: 100, pesoKg: 87.2, tallaCm: 178, porcGrasa: 28.5, porcMasaMuscular: 32.1, kgGrasa: 24.9, kgMusculo: 28.0 },
      { diasAtras: 60, pesoKg: 88.5, tallaCm: 178, porcGrasa: 29.2, porcMasaMuscular: 31.8, kgGrasa: 25.8, kgMusculo: 28.1 },
      { diasAtras: 20, pesoKg: 87.8, tallaCm: 178, porcGrasa: 29.0, porcMasaMuscular: 31.9, kgGrasa: 25.5, kgMusculo: 28.0, dx: 'Sin cambios significativos', observaciones: 'Dificultad para sostener el plan entre semana.' },
    ],
    planes: [
      {
        diasDesde: 140, estado: 'vigente', titulo: 'Plan nutricional — hipertensión y sobrepeso',
        nutri: {
          pautasGenerales: 'Reducción de sodio, control de porciones, 4 comidas diarias.',
          pautasHidratacion: '2L de agua por día.',
          suplementacion: null,
        },
      },
    ],
    turnos: [
      { diasOffset: -145, tipo: 'nutricion', servicio: 'Consulta Inicial', estado: 'completado' },
      { diasOffset: -110, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'completado' },
      { diasOffset: -70, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'no_asistio', notasProfesional: 'No avisó, no se pudo contactar en el horario.' },
      { diasOffset: -35, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'completado' },
      { diasOffset: -12, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'cancelado', notasProfesional: 'Reprogramar, avisó por WhatsApp que no llegaba.' },
    ],
    objetivos: [
      { categoria: 'nutricional', descripcion: 'Bajar 5kg en 3 meses', estado: 'descartado', diasObjetivo: -30 },
      { categoria: 'clinico', descripcion: 'Controlar glucemia en ayunas', estado: 'en_progreso', diasObjetivo: 15 },
      { categoria: 'nutricional', descripcion: 'Ordenar el desayuno entre semana', estado: 'pendiente' },
    ],
    feedback: [
      { semanasAtras: 18 }, { semanasAtras: 14 }, { semanasAtras: 9, conMensaje: true },
      { semanasAtras: 5 }, { semanasAtras: 0, conMensaje: true },
    ],
    evolucion: [
      { diasAtras: 100, origen: 'nutricion', tipo: 'observacion', contenido: 'Cuesta que registre las comidas de la semana laboral, evaluar app de seguimiento más simple.', visible: false },
      { diasAtras: 30, origen: 'nutricion', tipo: 'evolucion', contenido: 'Peso estancado hace dos meses, sin avances claros.', visible: true },
    ],
  },
  {
    nombre: 'Camila',
    apellido: 'Sosa',
    email: 'camila.sosa@vimet.test',
    telefono: '3515550003',
    sexo: 'femenino',
    fechaNacimiento: '1999-11-23',
    ocupacion: 'Estudiante universitaria',
    servicio: 'nutricion',
    nivel: 'C',
    antiguedadDias: 35,
    ficha: {
      fuma: false, bebe: true, drogas: false, entrena: true,
      actividadDiaria: 'mucha', horasSueno: 7,
      dxMedico: null,
      dxNutricional: null,
      medicacion: null,
      suplementacion: 'Proteína whey post-entreno',
      lesiones: null,
      molestias: null,
      datosLaboratorio: null,
      motivosConsulta: 'Ordenar la alimentación para acompañar el entrenamiento que ya hace por su cuenta.',
      observacionesInternas: 'Paciente nueva, primera consulta muy reciente.',
    },
    mediciones: [
      { diasAtras: 35, pesoKg: 65.0, tallaCm: 160, porcGrasa: 30.0, porcMasaMuscular: 28.5, kgGrasa: 19.5, kgMusculo: 18.5, dx: 'Ficha inicial', observaciones: 'Primera medición.' },
      { diasAtras: 10, pesoKg: 64.6, tallaCm: 160, porcGrasa: 29.5, porcMasaMuscular: 28.8, kgGrasa: 19.1, kgMusculo: 18.6, dx: 'Primer control de seguimiento' },
    ],
    planes: [
      {
        diasDesde: 30, estado: 'vigente', titulo: 'Plan nutricional inicial',
        nutri: {
          pautasGenerales: 'Plan normocalórico, ajustado a los días de entrenamiento.',
          pautasHidratacion: '2L de agua por día, más en días de entrenamiento.',
          suplementacion: 'Proteína whey post-entreno.',
        },
      },
    ],
    turnos: [
      { diasOffset: -30, tipo: 'nutricion', servicio: 'Consulta Inicial', estado: 'completado' },
      { diasOffset: -16, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'completado' },
      { diasOffset: -3, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'completado' },
      { diasOffset: 7, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'pendiente' },
    ],
    objetivos: [
      { categoria: 'nutricional', descripcion: 'Armar rutina alimentaria semanal', estado: 'pendiente', diasObjetivo: 20 },
      { categoria: 'antropometrico', descripcion: 'Primer control completo de composición corporal', estado: 'en_progreso', diasObjetivo: 10 },
    ],
    feedback: [
      { semanasAtras: 2 }, { semanasAtras: 0, conMensaje: true },
    ],
    evolucion: [
      { diasAtras: 30, origen: 'nutricion', tipo: 'observacion', contenido: 'Primera consulta, ficha y objetivos cargados.', visible: false },
    ],
  },

  // ─────────────────────────── Entrenamiento ───────────────────────────
  {
    nombre: 'Federico Ariel',
    apellido: 'Molina',
    email: 'federico.molina@vimet.test',
    telefono: '3515550004',
    sexo: 'masculino',
    fechaNacimiento: '1997-05-09',
    ocupacion: 'Desarrollador de software',
    servicio: 'entrenamiento',
    nivel: 'A',
    antiguedadDias: 176,
    ficha: {
      fuma: false, bebe: true, drogas: false, entrena: true,
      actividadDiaria: 'normal', horasSueno: 7,
      dxMedico: null,
      dxNutricional: null,
      medicacion: null,
      suplementacion: 'Creatina, proteína whey',
      lesiones: null,
      molestias: null,
      datosLaboratorio: null,
      motivosConsulta: 'Ganar masa muscular y mejorar composición corporal.',
      observacionesInternas: 'Excelente adherencia y progreso constante, candidato a plan más exigente.',
    },
    mediciones: [
      { diasAtras: 176, pesoKg: 82.0, tallaCm: 180, porcGrasa: 22.0, porcMasaMuscular: 38.0, kgGrasa: 18.0, kgMusculo: 31.2, dx: 'Ficha inicial' },
      { diasAtras: 140, pesoKg: 83.5, tallaCm: 180, porcGrasa: 19.5, porcMasaMuscular: 40.0, kgGrasa: 16.3, kgMusculo: 33.4 },
      { diasAtras: 100, pesoKg: 84.8, tallaCm: 180, porcGrasa: 17.8, porcMasaMuscular: 41.5, kgGrasa: 15.1, kgMusculo: 35.2 },
      { diasAtras: 60, pesoKg: 85.6, tallaCm: 180, porcGrasa: 16.2, porcMasaMuscular: 43.0, kgGrasa: 13.9, kgMusculo: 36.8 },
      { diasAtras: 20, pesoKg: 86.0, tallaCm: 180, porcGrasa: 15.0, porcMasaMuscular: 44.2, kgGrasa: 12.9, kgMusculo: 38.0, dx: 'Excelente composición corporal', observaciones: 'Progreso sostenido, buena definición.' },
    ],
    evaluaciones: [
      { diasAtras: 176, tests: { wells: 5, thomas: 4, dorsi: 5, sentadilla: 4, estabilidad: 4, fuerzaInf: 7, fuerzaSup: 6, resistencia: 10 } },
      { diasAtras: 90, tests: { wells: 7, thomas: 6, dorsi: 7, sentadilla: 6, estabilidad: 6, fuerzaInf: 10, fuerzaSup: 8, resistencia: 12 } },
      { diasAtras: 20, tests: { wells: 9, thomas: 8, dorsi: 8, sentadilla: 8, estabilidad: 7, fuerzaInf: 12, fuerzaSup: 11, resistencia: 15 }, observaciones: 'Muy buena evolución en todos los tests.' },
    ],
    planes: [
      {
        diasDesde: 170, diasHasta: 60, estado: 'archivado', titulo: 'Plan de fuerza — fase inicial',
        entreno: { disciplina: 'Entrenamiento de fuerza', experienciaPrevia: 'Ninguna', frecuencia: '3 veces por semana', volumen: 'Moderado' },
        ejercicios: [
          { parteCuerpo: 'Pecho', dia: 'lunes', series: 4, repeticiones: '8-12', descansoSeg: 90 },
          { parteCuerpo: 'Espalda', dia: 'lunes', series: 4, repeticiones: '8-12', descansoSeg: 90 },
          { parteCuerpo: 'Piernas', dia: 'miercoles', series: 4, repeticiones: '10-15', descansoSeg: 90 },
          { parteCuerpo: 'Hombros', dia: 'viernes', series: 3, repeticiones: '12', descansoSeg: 60 },
        ],
      },
      {
        diasDesde: 55, estado: 'vigente', titulo: 'Plan de fuerza — fase de hipertrofia',
        entreno: { disciplina: 'Entrenamiento de fuerza', experienciaPrevia: '6 meses de entrenamiento previo', frecuencia: '4 veces por semana', volumen: 'Alto' },
        ejercicios: [
          { parteCuerpo: 'Pecho', dia: 'lunes', series: 4, repeticiones: '6-10', descansoSeg: 120 },
          { parteCuerpo: 'Espalda', dia: 'lunes', series: 4, repeticiones: '6-10', descansoSeg: 120 },
          { parteCuerpo: 'Piernas', dia: 'miercoles', series: 5, repeticiones: '8-12', descansoSeg: 120 },
          { parteCuerpo: 'Abdomen', dia: 'miercoles', series: 3, repeticiones: '15', descansoSeg: 45 },
          { cardio: true, dia: 'viernes', entradaCalor: { valor: 5, unidad: 'minutos' }, trabajoPrincipal: { valor: 20, unidad: 'minutos' }, vueltaCalma: { valor: 5, unidad: 'minutos' } },
        ],
      },
    ],
    turnos: [
      { diasOffset: -170, tipo: 'entrenamiento', servicio: 'Evaluación Funcional', estado: 'completado' },
      { diasOffset: -140, tipo: 'entrenamiento', servicio: 'Entrenamiento de Fuerza', estado: 'completado' },
      { diasOffset: -105, tipo: 'entrenamiento', servicio: 'Entrenamiento de Fuerza', estado: 'completado' },
      { diasOffset: -70, tipo: 'entrenamiento', servicio: 'Acondicionamiento Metabólico', estado: 'completado' },
      { diasOffset: -35, tipo: 'entrenamiento', servicio: 'Entrenamiento de Fuerza', estado: 'completado' },
      { diasOffset: 9, tipo: 'entrenamiento', servicio: 'Entrenamiento de Fuerza', estado: 'confirmado' },
    ],
    objetivos: [
      { categoria: 'entrenamiento', descripcion: 'Mejorar sentadilla y estabilidad', estado: 'cumplido', diasObjetivo: -30 },
      { categoria: 'rendimiento', descripcion: 'Aumentar fuerza en press de banca 15%', estado: 'cumplido', diasObjetivo: -10 },
      { categoria: 'antropometrico', descripcion: 'Ganar 3kg de masa muscular', estado: 'en_progreso', diasObjetivo: 40 },
    ],
    feedback: [
      { semanasAtras: 22 }, { semanasAtras: 18 }, { semanasAtras: 14 }, { semanasAtras: 10 },
      { semanasAtras: 7, conMensaje: true }, { semanasAtras: 4 }, { semanasAtras: 2, conMensaje: true }, { semanasAtras: 0, conMensaje: true },
    ],
    evolucion: [
      { diasAtras: 140, origen: 'entrenamiento', tipo: 'evolucion', contenido: 'Buena progresión de cargas en los ejercicios base, sin molestias.', visible: true },
      { diasAtras: 60, origen: 'entrenamiento', tipo: 'evolucion', contenido: 'Pasa a fase de hipertrofia, aumenta frecuencia semanal.', visible: true },
      { diasAtras: 15, origen: 'entrenamiento', tipo: 'observacion', contenido: 'Evaluar sumar un día de entrenamiento más si sigue este ritmo.', visible: false },
    ],
  },
  {
    nombre: 'Lucía',
    apellido: 'Romero',
    email: 'lucia.romero@vimet.test',
    telefono: '3515550005',
    sexo: 'femenino',
    fechaNacimiento: '1985-01-30',
    ocupacion: 'Docente',
    servicio: 'entrenamiento',
    nivel: 'B',
    antiguedadDias: 128,
    ficha: {
      fuma: false, bebe: false, drogas: false, entrena: true,
      actividadDiaria: 'poca', horasSueno: 6,
      dxMedico: 'Hipotiroidismo tratado',
      dxNutricional: null,
      medicacion: 'Levotiroxina 50mcg',
      suplementacion: null,
      lesiones: 'Molestia crónica en rodilla derecha',
      molestias: 'Fatiga',
      datosLaboratorio: 'TSH controlada (último análisis: 2.1).',
      motivosConsulta: 'Retomar actividad física tras un año sedentaria.',
      observacionesInternas: 'Asistencia irregular, conviene reforzar seguimiento por feedback semanal.',
    },
    mediciones: [
      { diasAtras: 128, pesoKg: 70.0, tallaCm: 163, porcGrasa: 28.0, porcMasaMuscular: 29.0, kgGrasa: 19.6, kgMusculo: 20.3, dx: 'Ficha inicial, sedentaria hace un año' },
      { diasAtras: 80, pesoKg: 71.2, tallaCm: 163, porcGrasa: 28.5, porcMasaMuscular: 29.2, kgGrasa: 20.3, kgMusculo: 20.8 },
      { diasAtras: 30, pesoKg: 70.8, tallaCm: 163, porcGrasa: 28.2, porcMasaMuscular: 29.0, kgGrasa: 20.0, kgMusculo: 20.5, dx: 'Sin cambios relevantes', observaciones: 'Asistencia irregular en el último mes.' },
    ],
    evaluaciones: [
      { diasAtras: 128, tests: { wells: 4, thomas: 3, dorsi: 4, sentadilla: 3, estabilidad: 4, fuerzaInf: 6, fuerzaSup: 5, resistencia: 9 } },
      { diasAtras: 60, tests: { wells: 4, thomas: 4, dorsi: 4, sentadilla: 4, estabilidad: 4, fuerzaInf: 6, fuerzaSup: 6, resistencia: 9 } },
      { diasAtras: 15, tests: { wells: 3, thomas: 3, dorsi: 4, sentadilla: 3, estabilidad: 3, fuerzaInf: 6, fuerzaSup: 5, resistencia: 9 }, observaciones: 'Leve retroceso, coincide con varias semanas sin asistir.' },
    ],
    planes: [
      {
        diasDesde: 125, estado: 'vigente', titulo: 'Plan de reacondicionamiento físico',
        entreno: { disciplina: 'Reacondicionamiento general', experienciaPrevia: 'Sedentaria hace 1 año', frecuencia: '2-3 veces por semana', volumen: 'Bajo a moderado' },
        ejercicios: [
          { parteCuerpo: 'Piernas', dia: 'lunes', series: 3, repeticiones: '12', descansoSeg: 60 },
          { parteCuerpo: 'Espalda', dia: 'miercoles', series: 3, repeticiones: '10', descansoSeg: 60 },
          { parteCuerpo: 'Hombros', dia: 'viernes', series: 3, repeticiones: '12', descansoSeg: 60 },
          { parteCuerpo: 'Abdomen', dia: 'viernes', series: 3, repeticiones: '15', descansoSeg: 45 },
        ],
      },
    ],
    turnos: [
      { diasOffset: -120, tipo: 'entrenamiento', servicio: 'Evaluación Funcional', estado: 'completado' },
      { diasOffset: -85, tipo: 'entrenamiento', servicio: 'Entrenamiento de Fuerza', estado: 'completado' },
      { diasOffset: -50, tipo: 'entrenamiento', servicio: 'Entrenamiento de Fuerza', estado: 'no_asistio', notasProfesional: 'No se presentó, sin aviso.' },
      { diasOffset: -18, tipo: 'entrenamiento', servicio: 'Entrenamiento de Fuerza', estado: 'completado' },
    ],
    objetivos: [
      { categoria: 'entrenamiento', descripcion: 'Sostener 3 sesiones semanales', estado: 'descartado', diasObjetivo: -25 },
      { categoria: 'rendimiento', descripcion: 'Mejorar resistencia metabólica', estado: 'pendiente', diasObjetivo: 20 },
      { categoria: 'clinico', descripcion: 'Chequeo de rodilla con traumatólogo', estado: 'pendiente' },
    ],
    feedback: [
      { semanasAtras: 16 }, { semanasAtras: 11, conMensaje: true }, { semanasAtras: 6 }, { semanasAtras: 3 }, { semanasAtras: 0, conMensaje: true },
    ],
    evolucion: [
      { diasAtras: 80, origen: 'entrenamiento', tipo: 'observacion', contenido: 'Falta a una de cada tres sesiones agendadas, evaluar horario más cómodo.', visible: false },
      { diasAtras: 20, origen: 'entrenamiento', tipo: 'evolucion', contenido: 'Últimas semanas sin avances, refuerza la rodilla al hacer sentadilla.', visible: true },
    ],
  },
  {
    nombre: 'Nicolás',
    apellido: 'Herrera',
    email: 'nicolas.herrera@vimet.test',
    telefono: '3515550006',
    sexo: 'masculino',
    fechaNacimiento: '2004-07-17',
    ocupacion: 'Estudiante',
    servicio: 'entrenamiento',
    nivel: 'C',
    antiguedadDias: 30,
    ficha: {
      fuma: false, bebe: true, drogas: false, entrena: false,
      actividadDiaria: 'poca', horasSueno: 7.5,
      dxMedico: null,
      dxNutricional: null,
      medicacion: null,
      suplementacion: null,
      lesiones: null,
      molestias: null,
      datosLaboratorio: null,
      motivosConsulta: 'Empezar a entrenar de cero, sin experiencia previa.',
      observacionesInternas: 'Recién arranca, buena predisposición en la evaluación inicial.',
    },
    mediciones: [
      { diasAtras: 30, pesoKg: 75.0, tallaCm: 175, porcGrasa: 20.0, porcMasaMuscular: 35.0, kgGrasa: 15.0, kgMusculo: 26.3, dx: 'Ficha inicial' },
      { diasAtras: 7, pesoKg: 75.4, tallaCm: 175, porcGrasa: 19.7, porcMasaMuscular: 35.4, kgGrasa: 14.9, kgMusculo: 26.7 },
    ],
    evaluaciones: [
      { diasAtras: 25, tests: { wells: 5, thomas: 5, dorsi: 5, sentadilla: 5, estabilidad: 5, fuerzaInf: 8, fuerzaSup: 7, resistencia: 10 }, observaciones: 'Evaluación inicial, sin experiencia previa de entrenamiento.' },
    ],
    planes: [
      {
        diasDesde: 28, estado: 'vigente', titulo: 'Plan de entrenamiento — iniciación',
        entreno: { disciplina: 'Fuerza general', experienciaPrevia: 'Ninguna', frecuencia: '3 veces por semana', volumen: 'Bajo' },
        ejercicios: [
          { parteCuerpo: 'Pecho', dia: 'lunes', series: 3, repeticiones: '10', descansoSeg: 60 },
          { parteCuerpo: 'Espalda', dia: 'miercoles', series: 3, repeticiones: '10', descansoSeg: 60 },
          { parteCuerpo: 'Piernas', dia: 'viernes', series: 3, repeticiones: '10', descansoSeg: 60 },
        ],
      },
    ],
    turnos: [
      { diasOffset: -25, tipo: 'entrenamiento', servicio: 'Evaluación Funcional', estado: 'completado' },
      { diasOffset: -15, tipo: 'entrenamiento', servicio: 'Entrenamiento de Fuerza', estado: 'completado' },
      { diasOffset: -2, tipo: 'entrenamiento', servicio: 'Entrenamiento de Fuerza', estado: 'completado' },
      { diasOffset: 14, tipo: 'entrenamiento', servicio: 'Entrenamiento de Fuerza', estado: 'pendiente' },
    ],
    objetivos: [
      { categoria: 'entrenamiento', descripcion: 'Aprender la técnica correcta de los levantamientos base', estado: 'en_progreso', diasObjetivo: 25 },
      { categoria: 'rendimiento', descripcion: 'Completar la evaluación funcional inicial', estado: 'cumplido', diasObjetivo: -5 },
    ],
    feedback: [
      { semanasAtras: 3 }, { semanasAtras: 0, conMensaje: true },
    ],
    evolucion: [
      { diasAtras: 25, origen: 'entrenamiento', tipo: 'observacion', contenido: 'Primera evaluación, buena disposición y sin lesiones previas.', visible: false },
    ],
  },

  // ──────────────────────────────── Combo ────────────────────────────────
  {
    nombre: 'Valentina',
    apellido: 'Paz',
    email: 'valentina.paz@vimet.test',
    telefono: '3515550007',
    sexo: 'femenino',
    fechaNacimiento: '1995-02-11',
    ocupacion: 'Abogada',
    servicio: 'combo',
    nivel: 'A',
    antiguedadDias: 189,
    ficha: {
      fuma: false, bebe: true, drogas: false, entrena: true,
      actividadDiaria: 'mucha', horasSueno: 7,
      dxMedico: null,
      dxNutricional: 'Sobrepeso leve al inicio (resuelto)',
      medicacion: null,
      suplementacion: 'Multivitamínico, proteína whey',
      lesiones: null,
      molestias: null,
      datosLaboratorio: 'Perfil lipídico normalizado (último control).',
      motivosConsulta: 'Plan integral de nutrición y entrenamiento para composición corporal.',
      observacionesInternas: 'La paciente más constante del consultorio, ISAK completo en 3 controles.',
    },
    mediciones: [
      {
        diasAtras: 189, pesoKg: 74.0, tallaCm: 168, porcGrasa: 30.0, porcMasaMuscular: 29.0, kgGrasa: 22.2, kgMusculo: 21.5,
        dx: 'Ficha inicial ISAK', observaciones: 'Primer control completo con datos ISAK.',
        isak: {
          triceps: 18.5, subescapular: 16.0, supraespinal: 14.0, abdominal: 22.0, muslo: 24.0, pierna: 16.5, biceps: 10.0, cresta: 18.0,
          perimetroBrazo: 28.5, perimetroMuslo: 54.0, perimetroPierna: 35.0, kgTejidoMuscular: 24.0, kgTejidoOseo: 8.7,
        },
      },
      { diasAtras: 150, pesoKg: 72.0, tallaCm: 168, porcGrasa: 27.5, porcMasaMuscular: 30.0, kgGrasa: 19.8, kgMusculo: 21.6 },
      {
        diasAtras: 110, pesoKg: 70.0, tallaCm: 168, porcGrasa: 25.0, porcMasaMuscular: 31.5, kgGrasa: 17.5, kgMusculo: 22.1,
        observaciones: 'Segundo control ISAK, mejora clara en IMO.',
        isak: {
          triceps: 15.0, subescapular: 13.5, supraespinal: 11.5, abdominal: 18.0, muslo: 20.0, pierna: 14.0, biceps: 8.5, cresta: 15.0,
          perimetroBrazo: 29.5, perimetroMuslo: 55.5, perimetroPierna: 36.0, kgTejidoMuscular: 25.5, kgTejidoOseo: 8.8,
        },
      },
      { diasAtras: 70, pesoKg: 68.5, tallaCm: 168, porcGrasa: 23.0, porcMasaMuscular: 33.0, kgGrasa: 15.8, kgMusculo: 22.6 },
      {
        diasAtras: 35, pesoKg: 67.0, tallaCm: 168, porcGrasa: 21.5, porcMasaMuscular: 34.5, kgGrasa: 14.4, kgMusculo: 23.1,
        dx: 'Muy buena evolución', observaciones: 'Tercer control ISAK, IMO en rango muy alto.',
        isak: {
          triceps: 12.0, subescapular: 11.0, supraespinal: 9.0, abdominal: 15.0, muslo: 16.5, pierna: 12.0, biceps: 7.0, cresta: 12.5,
          perimetroBrazo: 30.5, perimetroMuslo: 57.0, perimetroPierna: 37.0, kgTejidoMuscular: 27.0, kgTejidoOseo: 8.9,
        },
      },
      { diasAtras: 12, pesoKg: 66.0, tallaCm: 168, porcGrasa: 20.5, porcMasaMuscular: 35.5, kgGrasa: 13.5, kgMusculo: 23.4, dx: 'Dentro de objetivo' },
    ],
    evaluaciones: [
      { diasAtras: 189, tests: { wells: 5, thomas: 5, dorsi: 5, sentadilla: 4, estabilidad: 5, fuerzaInf: 7, fuerzaSup: 7, resistencia: 10 } },
      { diasAtras: 100, tests: { wells: 8, thomas: 7, dorsi: 7, sentadilla: 7, estabilidad: 6, fuerzaInf: 11, fuerzaSup: 10, resistencia: 14 } },
      { diasAtras: 25, tests: { wells: 9, thomas: 9, dorsi: 9, sentadilla: 9, estabilidad: 8, fuerzaInf: 13, fuerzaSup: 12, resistencia: 19 }, observaciones: 'Excelente condición física general.' },
    ],
    planes: [
      {
        diasDesde: 185, diasHasta: 68, estado: 'archivado', titulo: 'Plan integral inicial',
        nutri: { pautasGenerales: 'Plan hipocalórico moderado con foco en proteína.', pautasHidratacion: '2.5L de agua por día.', suplementacion: 'Multivitamínico.' },
        entreno: { disciplina: 'Fuerza + acondicionamiento', experienciaPrevia: 'Entrena de forma recreativa', frecuencia: '3 veces por semana', volumen: 'Moderado' },
        ejercicios: [
          { parteCuerpo: 'Piernas', dia: 'lunes', series: 4, repeticiones: '10', descansoSeg: 90 },
          { parteCuerpo: 'Espalda', dia: 'martes', series: 4, repeticiones: '10', descansoSeg: 90 },
          { parteCuerpo: 'Hombros', dia: 'jueves', series: 3, repeticiones: '12', descansoSeg: 60 },
        ],
      },
      {
        diasDesde: 65, estado: 'vigente', titulo: 'Plan integral — fase de definición',
        nutri: { pautasGenerales: 'Plan ajustado tras buena evolución, mantiene proteína alta y reduce carbohidratos simples.', pautasHidratacion: '2.5L de agua por día.', suplementacion: 'Multivitamínico, proteína whey.' },
        entreno: { disciplina: 'Fuerza + acondicionamiento', experienciaPrevia: '6 meses en el plan', frecuencia: '4 veces por semana', volumen: 'Alto' },
        ejercicios: [
          { parteCuerpo: 'Piernas', dia: 'lunes', series: 4, repeticiones: '8-10', descansoSeg: 120 },
          { parteCuerpo: 'Espalda', dia: 'martes', series: 4, repeticiones: '8', descansoSeg: 120 },
          { parteCuerpo: 'Abdomen', dia: 'martes', series: 3, repeticiones: '20', descansoSeg: 45 },
          { cardio: true, dia: 'jueves', entradaCalor: { valor: 8, unidad: 'minutos' }, trabajoPrincipal: { valor: 30, unidad: 'minutos' }, vueltaCalma: { valor: 6, unidad: 'minutos' } },
        ],
      },
    ],
    turnos: [
      { diasOffset: -180, tipo: 'combo', servicio: 'Plan de Transformación Física', estado: 'completado' },
      { diasOffset: -140, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'completado' },
      { diasOffset: -100, tipo: 'entrenamiento', servicio: 'Entrenamiento de Fuerza', estado: 'completado' },
      { diasOffset: -60, tipo: 'combo', servicio: 'Plan de Transformación Física', estado: 'completado' },
      { diasOffset: -25, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'completado' },
      { diasOffset: 6, tipo: 'combo', servicio: 'Plan de Transformación Física', estado: 'pendiente' },
    ],
    objetivos: [
      { categoria: 'antropometrico', descripcion: 'Bajar % de grasa a 20%', estado: 'cumplido', diasObjetivo: -15 },
      { categoria: 'rendimiento', descripcion: 'Subir el IMO a rango Alto', estado: 'cumplido', diasObjetivo: -40 },
      { categoria: 'nutricional', descripcion: 'Sostener el objetivo diario de hidratación', estado: 'en_progreso', diasObjetivo: 20 },
      { categoria: 'entrenamiento', descripcion: 'Sumar una sesión semanal de fuerza', estado: 'cumplido', diasObjetivo: -60 },
    ],
    feedback: [
      { semanasAtras: 24 }, { semanasAtras: 20 }, { semanasAtras: 16 }, { semanasAtras: 12, conMensaje: true },
      { semanasAtras: 9 }, { semanasAtras: 6, conMensaje: true }, { semanasAtras: 3 }, { semanasAtras: 1, conMensaje: true }, { semanasAtras: 0, conMensaje: true },
    ],
    evolucion: [
      { diasAtras: 150, origen: 'nutricion', tipo: 'evolucion', contenido: 'Excelente adherencia al plan nutricional desde el inicio.', visible: true },
      { diasAtras: 100, origen: 'entrenamiento', tipo: 'evolucion', contenido: 'Mejora notable en los tests de fuerza y estabilidad.', visible: true },
      { diasAtras: 35, origen: 'nutricion', tipo: 'evolucion', contenido: 'Tercer control ISAK: IMO pasa a rango Muy alto.', visible: true },
      { diasAtras: 10, origen: 'entrenamiento', tipo: 'observacion', contenido: 'Candidata a plan de rendimiento una vez estabilizada la composición corporal.', visible: false },
    ],
  },
  {
    nombre: 'Diego Alejandro',
    apellido: 'Funes',
    email: 'diego.funes@vimet.test',
    telefono: '3515550008',
    sexo: 'masculino',
    fechaNacimiento: '1981-09-28',
    ocupacion: 'Comerciante',
    servicio: 'combo',
    nivel: 'B',
    antiguedadDias: 121,
    ficha: {
      fuma: true, bebe: true, drogas: false, entrena: true,
      actividadDiaria: 'poca', horasSueno: 5,
      dxMedico: 'Prediabetes',
      dxNutricional: 'Sobrepeso grado II',
      medicacion: 'Metformina 500mg',
      suplementacion: null,
      lesiones: null,
      molestias: 'Dolor lumbar ocasional',
      datosLaboratorio: 'HbA1c 6.1% (último análisis).',
      motivosConsulta: 'Plan integral por indicación médica (prediabetes).',
      observacionesInternas: 'Adherencia irregular, retrocesos en las últimas mediciones — reforzar en próxima consulta.',
    },
    mediciones: [
      {
        diasAtras: 121, pesoKg: 88.0, tallaCm: 174, porcGrasa: 27.0, porcMasaMuscular: 33.0, kgGrasa: 23.8, kgMusculo: 29.0,
        dx: 'Sobrepeso grado II, prediabetes', observaciones: 'Primer control con datos ISAK.',
        isak: {
          triceps: 16.0, subescapular: 15.0, supraespinal: 13.0, abdominal: 24.0, muslo: 22.0, pierna: 15.0, biceps: 9.0, cresta: 16.0,
          perimetroBrazo: 32.0, perimetroMuslo: 58.0, perimetroPierna: 38.0, kgTejidoMuscular: 26.0, kgTejidoOseo: 9.2,
        },
      },
      { diasAtras: 80, pesoKg: 89.5, tallaCm: 174, porcGrasa: 28.0, porcMasaMuscular: 32.0, kgGrasa: 25.1, kgMusculo: 28.6 },
      { diasAtras: 40, pesoKg: 90.5, tallaCm: 174, porcGrasa: 29.0, porcMasaMuscular: 31.0, kgGrasa: 26.2, kgMusculo: 28.1 },
      {
        diasAtras: 15, pesoKg: 91.2, tallaCm: 174, porcGrasa: 30.0, porcMasaMuscular: 30.0, kgGrasa: 27.4, kgMusculo: 27.4,
        dx: 'Retroceso en la composición corporal', observaciones: 'Baja adherencia en el último mes.',
        isak: {
          triceps: 19.0, subescapular: 18.0, supraespinal: 16.0, abdominal: 28.0, muslo: 25.0, pierna: 17.0, biceps: 11.0, cresta: 19.0,
          perimetroBrazo: 31.0, perimetroMuslo: 57.0, perimetroPierna: 37.0, kgTejidoMuscular: 24.5, kgTejidoOseo: 9.3,
        },
      },
    ],
    evaluaciones: [
      { diasAtras: 121, tests: { wells: 6, thomas: 5, dorsi: 6, sentadilla: 5, estabilidad: 5, fuerzaInf: 8, fuerzaSup: 7, resistencia: 13 } },
      { diasAtras: 60, tests: { wells: 5, thomas: 4, dorsi: 5, sentadilla: 4, estabilidad: 4, fuerzaInf: 7, fuerzaSup: 6, resistencia: 12 } },
      { diasAtras: 10, tests: { wells: 3, thomas: 3, dorsi: 4, sentadilla: 3, estabilidad: 3, fuerzaInf: 5, fuerzaSup: 5, resistencia: 9 }, observaciones: 'Retroceso claro, coincide con baja adherencia general.' },
    ],
    planes: [
      {
        diasDesde: 115, estado: 'vigente', titulo: 'Plan integral — indicación médica',
        nutri: { pautasGenerales: 'Plan hipocalórico, bajo índice glucémico, sin azúcares simples.', pautasHidratacion: '2L de agua por día.', suplementacion: null },
        entreno: { disciplina: 'Fuerza general', experienciaPrevia: 'Poca', frecuencia: '2-3 veces por semana', volumen: 'Bajo a moderado' },
        ejercicios: [
          { parteCuerpo: 'Pecho', dia: 'lunes', series: 3, repeticiones: '10', descansoSeg: 60 },
          { parteCuerpo: 'Piernas', dia: 'miercoles', series: 3, repeticiones: '10', descansoSeg: 60 },
          { parteCuerpo: 'Espalda', dia: 'viernes', series: 3, repeticiones: '10', descansoSeg: 60 },
        ],
      },
    ],
    turnos: [
      { diasOffset: -115, tipo: 'combo', servicio: 'Plan de Transformación Física', estado: 'completado' },
      { diasOffset: -80, tipo: 'entrenamiento', servicio: 'Entrenamiento de Fuerza', estado: 'no_asistio', notasProfesional: 'No asistió, sin aviso previo.' },
      { diasOffset: -45, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'completado' },
      { diasOffset: -15, tipo: 'combo', servicio: 'Plan de Transformación Física', estado: 'cancelado', notasProfesional: 'Canceló por motivos laborales.' },
    ],
    objetivos: [
      { categoria: 'antropometrico', descripcion: 'Frenar el aumento de % de grasa corporal', estado: 'descartado', diasObjetivo: -20 },
      { categoria: 'clinico', descripcion: 'Análisis de sangre de control', estado: 'pendiente', diasObjetivo: 10 },
      { categoria: 'entrenamiento', descripcion: 'Retomar la frecuencia semanal de entrenamiento', estado: 'pendiente', diasObjetivo: -5 },
    ],
    feedback: [
      { semanasAtras: 17 }, { semanasAtras: 12 }, { semanasAtras: 7, conMensaje: true }, { semanasAtras: 3 }, { semanasAtras: 0, conMensaje: true },
    ],
    evolucion: [
      { diasAtras: 80, origen: 'entrenamiento', tipo: 'observacion', contenido: 'Faltó a la última sesión sin avisar, contactar por WhatsApp.', visible: false },
      { diasAtras: 15, origen: 'nutricion', tipo: 'evolucion', contenido: 'Retroceso en la última medición, refuerza la importancia del control médico por la prediabetes.', visible: true },
    ],
  },
  {
    nombre: 'Sofía',
    apellido: 'Ibarra',
    email: 'sofia.ibarra@vimet.test',
    telefono: '3515550009',
    sexo: 'femenino',
    fechaNacimiento: '1988-04-05',
    ocupacion: 'Enfermera',
    servicio: 'combo',
    nivel: 'C',
    antiguedadDias: 42,
    ficha: {
      fuma: false, bebe: false, drogas: false, entrena: false,
      actividadDiaria: 'normal', horasSueno: 6,
      dxMedico: null,
      dxNutricional: null,
      medicacion: null,
      suplementacion: null,
      lesiones: null,
      molestias: 'Cansancio por turnos rotativos',
      datosLaboratorio: null,
      motivosConsulta: 'Mejorar hábitos generales y empezar a entrenar.',
      observacionesInternas: 'Paciente nueva, primer turno combo ya realizado.',
    },
    mediciones: [
      { diasAtras: 42, pesoKg: 63.0, tallaCm: 170, porcGrasa: 26.0, porcMasaMuscular: 30.0, kgGrasa: 16.4, kgMusculo: 18.9, dx: 'Ficha inicial' },
      { diasAtras: 14, pesoKg: 62.5, tallaCm: 170, porcGrasa: 25.5, porcMasaMuscular: 30.3, kgGrasa: 15.9, kgMusculo: 18.9 },
    ],
    evaluaciones: [
      { diasAtras: 20, tests: { wells: 4, thomas: 4, dorsi: 5, sentadilla: 4, estabilidad: 4, fuerzaInf: 6, fuerzaSup: 6, resistencia: 9 }, observaciones: 'Evaluación inicial.' },
    ],
    planes: [
      {
        diasDesde: 35, estado: 'vigente', titulo: 'Plan integral inicial',
        nutri: { pautasGenerales: 'Plan de hábitos generales, adaptado a los turnos rotativos.', pautasHidratacion: '2L de agua por día.', suplementacion: null },
        entreno: { disciplina: 'Fuerza general', experienciaPrevia: 'Ninguna', frecuencia: '2 veces por semana', volumen: 'Bajo' },
        ejercicios: [
          { parteCuerpo: 'Piernas', dia: 'lunes', series: 3, repeticiones: '12', descansoSeg: 60 },
          { parteCuerpo: 'Espalda', dia: 'jueves', series: 3, repeticiones: '12', descansoSeg: 60 },
        ],
      },
    ],
    turnos: [
      { diasOffset: -38, tipo: 'combo', servicio: 'Plan de Transformación Física', estado: 'completado' },
      { diasOffset: -14, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'completado' },
      { diasOffset: -5, tipo: 'entrenamiento', servicio: 'Entrenamiento de Fuerza', estado: 'completado' },
      { diasOffset: 9, tipo: 'entrenamiento', servicio: 'Entrenamiento de Fuerza', estado: 'pendiente' },
    ],
    objetivos: [
      { categoria: 'nutricional', descripcion: 'Completar la ficha alimentaria inicial', estado: 'cumplido', diasObjetivo: -20 },
      { categoria: 'entrenamiento', descripcion: 'Primera evaluación funcional completa', estado: 'pendiente', diasObjetivo: 15 },
    ],
    feedback: [
      { semanasAtras: 4 }, { semanasAtras: 1 }, { semanasAtras: 0, conMensaje: true },
    ],
    evolucion: [
      { diasAtras: 38, origen: 'nutricion', tipo: 'observacion', contenido: 'Primera consulta combo, buena predisposición.', visible: false },
    ],
  },
  {
    nombre: 'Martín Ezequiel',
    apellido: 'Vega',
    email: 'martin.vega@vimet.test',
    telefono: '3515550010',
    sexo: 'masculino',
    fechaNacimiento: '1993-12-19',
    ocupacion: 'Ingeniero civil',
    servicio: 'combo',
    nivel: 'C',
    antiguedadDias: 21,
    ficha: {
      fuma: false, bebe: true, drogas: false, entrena: false,
      actividadDiaria: 'poca', horasSueno: 6.5,
      dxMedico: null,
      dxNutricional: null,
      medicacion: null,
      suplementacion: null,
      lesiones: null,
      molestias: null,
      datosLaboratorio: null,
      motivosConsulta: 'Plan integral, arranca de cero con nutrición y entrenamiento.',
      observacionesInternas: 'El paciente más nuevo del consultorio, todavía sin evolución cargada.',
    },
    mediciones: [
      { diasAtras: 18, pesoKg: 80.0, tallaCm: 177, porcGrasa: 24.0, porcMasaMuscular: 34.0, kgGrasa: 19.2, kgMusculo: 27.2, dx: 'Ficha inicial, primera consulta combo' },
    ],
    evaluaciones: [
      { diasAtras: 12, tests: { wells: 4, thomas: 4, dorsi: 4, sentadilla: 4, estabilidad: 3, fuerzaInf: 6, fuerzaSup: 5, resistencia: 9 }, observaciones: 'Evaluación inicial.' },
    ],
    planes: [
      {
        diasDesde: 18, estado: 'vigente', titulo: 'Plan integral inicial',
        nutri: { pautasGenerales: 'Plan normocalórico de base, primeras pautas generales.', pautasHidratacion: '2L de agua por día.', suplementacion: null },
        entreno: { disciplina: 'Fuerza general', experienciaPrevia: 'Ninguna', frecuencia: '2 veces por semana', volumen: 'Bajo' },
        ejercicios: [
          { parteCuerpo: 'Pecho', dia: 'lunes', series: 3, repeticiones: '10', descansoSeg: 60 },
          { parteCuerpo: 'Piernas', dia: 'jueves', series: 3, repeticiones: '10', descansoSeg: 60 },
        ],
      },
    ],
    turnos: [
      { diasOffset: -18, tipo: 'combo', servicio: 'Plan de Transformación Física', estado: 'completado' },
      { diasOffset: -6, tipo: 'nutricion', servicio: 'Seguimiento Nutricional', estado: 'completado' },
      { diasOffset: 5, tipo: 'entrenamiento', servicio: 'Entrenamiento de Fuerza', estado: 'pendiente' },
      { diasOffset: 12, tipo: 'combo', servicio: 'Plan de Transformación Física', estado: 'pendiente' },
    ],
    objetivos: [
      { categoria: 'clinico', descripcion: 'Completar ficha clínica y laboratorio', estado: 'pendiente', diasObjetivo: 20 },
      { categoria: 'antropometrico', descripcion: 'Primera medición con datos ISAK', estado: 'pendiente', diasObjetivo: 30 },
    ],
    feedback: [
      { semanasAtras: 2 }, { semanasAtras: 0, conMensaje: true },
    ],
    evolucion: [
      { diasAtras: 18, origen: 'nutricion', tipo: 'observacion', contenido: 'Primera consulta combo, ficha básica cargada.', visible: false },
    ],
  },
]
