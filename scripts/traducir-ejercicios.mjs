// Traduce y capitaliza el catálogo de ejercicios (tabla `ejercicios`, seedeado en inglés por
// seed-ejercicios.mjs). Corrida única, se ejecuta a mano: `npm run translate:ejercicios`.
//
// ponytail: traducción por diccionario de vocabulario gym + reordenado heurístico (última
// palabra no-equipo pasa al frente como "cabeza" del nombre), no una API de traducción.
// Cubre las ~530 palabras únicas del catálogo real (verificado contra la tabla). Nombres muy
// atípicos pueden sonar un poco literales — conviene un spot-check de una muestra después de
// correrlo. Upgrade path si aparecen quejas de calidad: revisión manual puntual o API de
// traducción real.
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

// --- Campos "enum" (categoria/parte_cuerpo comparten el mismo set de 10 valores) ---
const PARTE_CUERPO_ES = {
  back: 'Espalda',
  cardio: 'Cardio',
  chest: 'Pecho',
  'lower arms': 'Antebrazos',
  'lower legs': 'Pantorrillas',
  neck: 'Cuello',
  shoulders: 'Hombros',
  'upper arms': 'Brazos',
  'upper legs': 'Piernas',
  waist: 'Abdomen',
}

const EQUIPO_ENUM_ES = {
  assisted: 'Asistido',
  band: 'Banda elástica',
  barbell: 'Barra',
  'body weight': 'Peso corporal',
  'bosu ball': 'Bosu',
  cable: 'Polea',
  dumbbell: 'Mancuerna',
  'elliptical machine': 'Elíptica',
  'ez barbell': 'Barra Z',
  hammer: 'Máquina Hammer',
  kettlebell: 'Pesa rusa',
  'leverage machine': 'Máquina de palanca',
  'medicine ball': 'Balón medicinal',
  'olympic barbell': 'Barra olímpica',
  'resistance band': 'Banda de resistencia',
  roller: 'Rodillo',
  rope: 'Cuerda',
  'skierg machine': 'Máquina SkiErg',
  'sled machine': 'Trineo',
  'smith machine': 'Máquina Smith',
  'stability ball': 'Pelota de estabilidad',
  'stationary bike': 'Bicicleta fija',
  'stepmill machine': 'Escalera mecánica',
  tire: 'Neumático',
  'trap bar': 'Barra hexagonal',
  'upper body ergometer': 'Ergómetro de brazos',
  weighted: 'Con peso adicional',
  'wheel roller': 'Rueda abdominal',
}

const MUSCULO_ES = {
  abdominals: 'Abdominales',
  abductors: 'Abductores',
  abs: 'Abdominales',
  adductors: 'Aductores',
  'ankle stabilizers': 'Estabilizadores del tobillo',
  ankles: 'Tobillos',
  back: 'Espalda',
  biceps: 'Bíceps',
  brachialis: 'Braquial',
  calves: 'Pantorrillas',
  'cardiovascular system': 'Sistema cardiovascular',
  chest: 'Pecho',
  core: 'Core',
  deltoids: 'Deltoides',
  delts: 'Deltoides',
  feet: 'Pies',
  forearms: 'Antebrazos',
  glutes: 'Glúteos',
  'grip muscles': 'Músculos de agarre',
  groin: 'Ingle',
  hamstrings: 'Isquiotibiales',
  hands: 'Manos',
  'hip flexors': 'Flexores de cadera',
  'inner thighs': 'Cara interna del muslo',
  'latissimus dorsi': 'Dorsal ancho',
  lats: 'Dorsales',
  'levator scapulae': 'Elevador de la escápula',
  'lower abs': 'Abdominales bajos',
  'lower back': 'Zona lumbar',
  obliques: 'Oblicuos',
  pectorals: 'Pectorales',
  quadriceps: 'Cuádriceps',
  quads: 'Cuádriceps',
  'rear deltoids': 'Deltoides posterior',
  rhomboids: 'Romboides',
  'rotator cuff': 'Manguito rotador',
  'serratus anterior': 'Serrato anterior',
  shins: 'Espinillas',
  shoulders: 'Hombros',
  soleus: 'Sóleo',
  spine: 'Columna',
  sternocleidomastoid: 'Esternocleidomastoideo',
  trapezius: 'Trapecio',
  traps: 'Trapecios',
  triceps: 'Tríceps',
  'upper back': 'Espalda alta',
  'upper chest': 'Pecho superior',
  'wrist extensors': 'Extensores de muñeca',
  'wrist flexors': 'Flexores de muñeca',
  wrists: 'Muñecas',
}

// --- Traducción del nombre del ejercicio ---

// Frases fijas que rompen el reordenado palabra-por-palabra (idioms / nombres compuestos).
// Se aplican primero, sobre el string ya normalizado (minúsculas, sin guiones).
const FRASES_ES = {
  'good morning': 'buenos días',
  'good mornings': 'buenos días',
  'turkish get up': 'levantamiento turco',
  'mountain climber': 'escalador',
  'mountain climbers': 'escaladores',
  'jumping jack': 'salto de tijera',
  'jumping jacks': 'saltos de tijera',
  'jack knife': 'navaja',
  'sit up': 'abdominal',
  'sit ups': 'abdominales',
  'push up': 'flexión',
  'push ups': 'flexiones',
  'pull up': 'dominada',
  'pull ups': 'dominadas',
  'chin up': 'dominada supina',
  'chin ups': 'dominadas supinas',
  'step up': 'subida al cajón',
  'step ups': 'subidas al cajón',
  'close grip': 'agarre cerrado',
  'wide grip': 'agarre abierto',
  'neutral grip': 'agarre neutro',
  'underhand grip': 'agarre supino',
  'overhand grip': 'agarre prono',
  'one arm': 'a una mano',
  'one leg': 'a una pierna',
  'one legged': 'a una pierna',
  'single arm': 'a una mano',
  'single leg': 'a una pierna',
  'single legged': 'a una pierna',
  'two arm': 'a dos manos',
  'both arms': 'a dos manos',
  'behind the head': 'detrás de la nuca',
  'behind head': 'detrás de la nuca',
  'behind back': 'por detrás de la espalda',
  'figure 8': 'ocho',
  'v up': 'V-up',
  'l sit': 'L-sit',
  'high knees': 'rodillas altas',
  'high knee': 'rodilla alta',
  'toe touch': 'toque de punta de pie',
  'calf raise': 'elevación de talones',
  'calf raises': 'elevaciones de talones',
  'skull crusher': 'rompecráneos',
  'skullcrusher': 'rompecráneos',
  'face pull': 'jalón a la cara',
  'face pulls': 'jalones a la cara',
  'butt kick': 'talón al glúteo',
  'butt kicks': 'talones al glúteo',
  'all fours': 'en cuatro patas',
  'farmers walk': 'paseo del granjero',
  'farmer walk': 'paseo del granjero',
  'captains chair': 'silla del capitán',
  'battling ropes': 'cuerdas de batalla',
  'battle ropes': 'cuerdas de batalla',
}

// Equipos multi-palabra (se extraen del nombre y van al final como "con X").
const EQUIPO_FRASES = [
  ['leverage machine', 'máquina de palanca'],
  ['smith machine', 'máquina Smith'],
  ['sled machine', 'trineo'],
  ['stepmill machine', 'escalera mecánica'],
  ['skierg machine', 'máquina SkiErg'],
  ['elliptical machine', 'elíptica'],
  ['stationary bike', 'bicicleta fija'],
  ['upper body ergometer', 'ergómetro de brazos'],
  ['medicine ball', 'balón medicinal'],
  ['stability ball', 'pelota de estabilidad'],
  ['bosu ball', 'bosu'],
  ['exercise ball', 'pelota de ejercicio'],
  ['resistance band', 'banda de resistencia'],
  ['olympic barbell', 'barra olímpica'],
  ['ez barbell', 'barra Z'],
  ['ez bar', 'barra Z'],
  ['trap bar', 'barra hexagonal'],
  ['wheel roller', 'rueda abdominal'],
  ['ab roller', 'rueda abdominal'],
  ['body weight', 'peso corporal'],
  ['bodyweight', 'peso corporal'],
  ['suspension trainer', 'suspensión'],
]

// Equipos de una sola palabra.
const EQUIPO_PALABRAS = {
  dumbbell: 'mancuerna', dumbbells: 'mancuernas',
  barbell: 'barra', barbells: 'barras', bar: 'barra', bars: 'barras',
  cable: 'polea', pulley: 'polea',
  ball: 'pelota',
  bench: 'banco', benches: 'bancos',
  band: 'banda', bands: 'bandas',
  smith: 'máquina Smith',
  kettlebell: 'pesa rusa', kettlebells: 'pesas rusas',
  rope: 'cuerda', ropes: 'cuerdas',
  ez: 'barra Z',
  sled: 'trineo', sledge: 'trineo',
  hammer: 'máquina Hammer',
  wall: 'pared',
  roller: 'rodillo', rollerout: 'rodillo',
  machine: 'máquina',
  towel: 'toalla',
  bosu: 'bosu',
  wheel: 'rueda',
  chair: 'silla',
  box: 'cajón', stepbox: 'cajón de step',
  cage: 'jaula',
  platform: 'plataforma',
  trainer: 'entrenador',
  straps: 'correas', strap: 'correa',
  rack: 'rack',
  plate: 'disco', plates: 'discos',
  bike: 'bicicleta',
  elliptical: 'elíptica',
  ergometer: 'ergómetro',
  trap: 'barra hexagonal',
  olympic: 'olímpica',
  handle: 'agarradera', handles: 'agarraderas',
  sandbag: 'saco de arena',
  tire: 'neumático',
  landmine: 'landmine',
  cambered: 'barra curva',
  sz: 'barra SZ',
  pad: 'almohadilla',
  stirrups: 'estribos',
  gripper: 'prensa de mano',
}

// Vocabulario general (movimientos, posiciones, músculos dentro del nombre, etc).
const WORD_ES = {
  // movimientos
  curl: 'curl', curls: 'curl',
  press: 'press', presses: 'press',
  row: 'remo',
  squat: 'sentadilla', squats: 'sentadillas', squatting: 'en sentadilla', squad: 'sentadilla',
  extension: 'extensión',
  raise: 'elevación', raises: 'elevaciones', raised: 'elevado',
  fly: 'apertura', flye: 'apertura', flyes: 'aperturas', crossover: 'cruce', crossovers: 'cruces',
  crunch: 'crunch', crunches: 'crunch',
  pull: 'jalón', pulldown: 'jalón', pushdown: 'extensión',
  dip: 'fondo', dips: 'fondos',
  twist: 'giro', twists: 'giros', twisting: 'girando', twisted: 'girado',
  lunge: 'zancada', stride: 'zancada',
  deadlift: 'peso muerto',
  pullover: 'pullover',
  shrug: 'encogimiento', shrugs: 'encogimientos',
  bridge: 'puente',
  clean: 'cargada',
  jump: 'salto', jumps: 'saltos', jumping: 'salto',
  kickback: 'patada', kickbacks: 'patadas', kick: 'patada', kicks: 'patadas',
  stretch: 'estiramiento',
  plank: 'plancha',
  snatch: 'arrancada',
  jerk: 'envión',
  swing: 'swing',
  thruster: 'thruster',
  march: 'marcha',
  climb: 'escalar', climber: 'escalador',
  slam: 'lanzamiento', throw: 'lanzamiento',
  windmill: 'molino',
  reach: 'alcance',
  pose: 'postura', stance: 'postura',
  drag: 'arrastre',
  hyperextension: 'hiperextensión',
  hang: 'colgado', hanging: 'colgado',
  rotation: 'rotación', rotational: 'rotacional', rotate: 'rotar',
  hug: 'abrazo',
  flip: 'voltereta',
  tuck: 'encogido',
  lift: 'levantamiento', lifting: 'levantamiento',
  drive: 'impulso',
  carry: 'carga',
  scissor: 'tijera',
  hop: 'salto', hops: 'saltos',
  swimmer: 'nadador',
  crawl: 'gateo',
  squeeze: 'apretón',
  catch: 'captura',
  pass: 'pase',
  handstand: 'pino',
  goblet: 'copa',
  pistol: 'pistol',
  walk: 'caminata', walking: 'caminando',
  tap: 'toque', touch: 'toque', touchers: 'toques',
  run: 'carrera', sprint: 'sprint', sprints: 'sprints',
  bend: 'flexión', bends: 'flexiones',
  flutter: 'aleteo',
  clap: 'palmada',
  slide: 'deslizamiento',
  hack: 'hack',
  skater: 'patinador',
  hook: 'gancho',

  // posiciones / grip / modificadores
  seated: 'sentado', sitted: 'sentado', sit: 'sentado',
  standing: 'de pie',
  incline: 'inclinado',
  decline: 'declinado',
  lying: 'acostado', reclining: 'reclinado',
  kneeling: 'de rodillas',
  close: 'cerrado', closer: 'cerrado',
  wide: 'abierto',
  reverse: 'inverso', reversed: 'invertido', revers: 'inverso', inverse: 'inverso', inverted: 'invertido',
  bent: 'flexionado',
  front: 'frontal',
  rear: 'posterior',
  overhead: 'por encima de la cabeza',
  alternate: 'alterno', alternating: 'alterno',
  straight: 'recto',
  single: 'individual',
  floor: 'piso', ground: 'suelo',
  prone: 'boca abajo',
  full: 'completo',
  cross: 'cruzado',
  underhand: 'agarre supino', overhand: 'agarre prono',
  narrow: 'estrecho',
  weighted: 'con peso',
  concentration: 'concentrado',
  assisted: 'asistido',
  supine: 'supino', pronated: 'pronado', supinated: 'supinado', pronate: 'pronar', pronation: 'pronación', supination: 'supinación',
  neutral: 'neutro',
  parallel: 'paralelo',
  military: 'militar',
  upright: 'vertical', vertical: 'vertical', horizontal: 'horizontal', diagonal: 'diagonal',
  split: 'dividida',
  behind: 'detrás',
  forward: 'hacia adelante', backward: 'hacia atrás',
  low: 'bajo', high: 'alto', upper: 'superior', lower: 'inferior', inner: 'interno', outer: 'externo', internal: 'interno', external: 'externo',
  outside: 'exterior', inside: 'interior',
  double: 'doble', semi: 'semi',
  stiff: 'rígido',
  sumo: 'sumo',
  isometric: 'isométrico',
  plyo: 'pliométrico',
  advanced: 'avanzado', basic: 'básico', intermediate: 'intermedio', modified: 'modificado', negative: 'negativo', dynamic: 'dinámico',
  extended: 'extendido', angled: 'angulado', angle: 'ángulo', short: 'corto', deep: 'profundo', big: 'grande', quick: 'rápido',
  self: 'auto', apart: 'separado', astride: 'a horcajadas', legged: '',
  contralateral: 'contralateral', unilateral: 'unilateral',
  supported: 'apoyado', suspended: 'suspendido', elevated: 'elevado', fixed: 'fijo',
  round: 'redondo', flat: 'plano',
  outstretched: 'extendido', clasped: 'entrelazado',
  facing: 'mirando', mixed: 'mixto',

  // partes del cuerpo / músculos dentro del nombre
  arm: 'brazo', arms: 'brazos',
  leg: 'pierna', legs: 'piernas',
  hip: 'cadera', hips: 'caderas',
  shoulder: 'hombro', shoulders: 'hombros', delt: 'deltoides', deltoid: 'deltoides',
  chest: 'pecho', pec: 'pectoral', pectoralis: 'pectoral',
  back: 'espalda',
  calf: 'pantorrilla', calves: 'pantorrillas',
  glute: 'glúteo', glutes: 'glúteos', gluteus: 'glúteo', butt: 'glúteo',
  hamstring: 'isquiotibial', quad: 'cuádriceps', quads: 'cuádriceps', femoris: 'femoral',
  bicep: 'bíceps', biceps: 'bíceps', tricep: 'tríceps', triceps: 'tríceps',
  wrist: 'muñeca', wrists: 'muñecas',
  knee: 'rodilla', knees: 'rodillas', keens: 'rodillas',
  ankle: 'tobillo', ankles: 'tobillos',
  neck: 'cuello',
  spine: 'columna', sternum: 'esternón',
  lat: 'dorsal',
  oblique: 'oblicuo',
  groin: 'ingle',
  hand: 'mano', hands: 'manos',
  foot: 'pie', feet: 'pies', toe: 'punta del pie', toes: 'puntas de los pies', heel: 'talón',
  elbow: 'codo',
  finger: 'dedo',
  palm: 'palma', palms: 'palmas',
  scapula: 'escápula', scapular: 'escapular',
  abductor: 'abductor', abduction: 'abducción', adductor: 'aductor', adduction: 'aducción',
  ab: 'abdominal', abdominal: 'abdominal',
  peroneals: 'peroneos', tibialis: 'tibial', piriformis: 'piriforme',
  muscle: 'músculo',
  pelvic: 'pélvico', tilt: 'inclinación',
  rectus: 'recto', major: 'mayor',
  body: 'cuerpo',

  // equipamiento (usado como sustantivo suelto en el medio del nombre, ya extraído aparte)
  medicine: '', stability: '', resistance: '',

  // proper nouns / loanwords (se mantienen)
  arnold: 'Arnold', bradford: 'Bradford', cuban: 'cubano', zercher: 'Zercher', zottman: 'Zottman',
  pallof: 'Pallof', tate: 'Tate', jefferson: 'Jefferson', gironda: 'Gironda', janda: 'Janda',
  otis: 'Otis', thibaudeau: 'Thibaudeau', pendlay: 'Pendlay', svend: 'Svend', romanian: 'rumano',
  hindu: 'hindú', turkish: 'turco', korean: 'coreano', maltese: 'maltés', london: 'Londres',
  scott: 'Scott', preacher: 'Scott', peacher: 'Scott', french: 'francés', renegade: 'renegado',
  cossack: 'cosaco', curtsey: 'reverencia', donkey: 'burro', frog: 'rana', spider: 'araña',
  superman: 'superman', burpee: 'burpee', kipping: 'kipping', sissy: 'sissy', planche: 'planche',
  straddle: 'straddle', stalder: 'Stalder', pike: 'pike', crab: 'cangrejo', bear: 'oso',
  cobra: 'cobra', dog: 'perro', cat: 'gato', gorilla: 'gorila', butterfly: 'mariposa',
  bug: 'insecto', dead: 'muerto', pirate: 'pirata', monster: 'monstruo', flag: 'bandera',
  sphinx: 'esfinge', stork: 'cigüeña', star: 'estrella', world: 'mundo', greatest: 'mejor',
  guillotine: 'guillotina', frankenstein: 'Frankenstein', prisoner: 'prisionero', waiter: 'mesero',
  bicycle: 'bicicleta', diamond: 'diamante', archer: 'arquero', v: 'V', l: 'L', t: 'T', w: 'W', y: 'Y',
  jm: 'JM', pin: 'pin', treadmill: 'cinta de correr', ski: 'esquí', skier: 'esquiador',
  boxing: 'boxeo', judo: 'judo', tennis: 'tenis', kayak: 'kayak', yoga: 'yoga',
  balance: 'equilibrio', power: 'potencia', speed: 'velocidad', gravity: 'gravedad',
  iron: 'hierro', board: 'tabla', clock: 'reloj', ring: 'anillo', rings: 'anillas',
  motion: 'movimiento', range: 'rango', depth: 'profundidad', pyramid: 'pirámide',
  release: 'liberación', support: 'apoyo', attachment: 'accesorio', cycle: 'ciclo',
  side: 'lateral', lateral: 'lateral', posterior: 'posterior', head: 'cabeza', lever: 'palanca',
  russian: 'ruso', push: 'empuje', down: 'abajo', drop: 'caída', elevator: 'elevador',
  twin: 'gemelo', upward: 'arriba', circular: 'circular', circles: 'círculos', flexion: 'flexión',
  flexor: 'flexor', femoral: 'femoral', impossible: 'imposible', multiple: 'múltiple', plus: 'más',
  pro: 'pro', reps: 'repeticiones', retractor: 'retractor', rocky: 'Rocky', rocking: 'balanceo',
  runners: 'corredores', saw: 'sierra', seesaw: 'balancín', skin: 'piel', skull: 'cráneo',
  skullcrusher: 'rompecráneos', stabilization: 'estabilización', staircase: 'escalera',
  stationary: 'fijo', step: 'paso', stepmill: 'escalera mecánica', thrusts: 'empujes',
  hyght: 'altura', hyper: 'hiper', inchworm: 'oruga', lean: 'inclinación', middle: 'medio',
  one: 'uno', anti: 'anti', air: 'aire', chin: 'dominada', figure: 'figura', depresor: 'depresor',
  rollerer: 'rodillo',
  three: 'tres', two: 'dos', half: 'medio', quarter: 'cuarto',
  degrees: 'grados', point: 'punto', sequence: 'secuencia', rotary: 'rotatorio',
  crusher: 'triturador', knife: 'navaja', jackknife: 'navaja',
}

const SKIP_WORDS = new Set([
  'a', 'above', 'across', 'against', 'all', 'and', 'around', 'at', 'between', 'both', 'from',
  'in', 'into', 'of', 'off', 'on', 'out', 'over', 'through', 'to', 'under', 'with', 'the',
  'up', 'ups', 'response', 'variation', 'style', 'position', 'equipment', 'exercise', 'pov',
  'male', 'female', 'good', 'morning', 'get', 'jack', 'grip', 'gripless',
  // ruido del dataset sin traducción razonable
  'breeding', 'supper', 'bowling', 'can', 'cocoons', 'wipers', 'bottoms',
  'wind', 'fallout', 'spell', 'caster', 'forth', 'blaster', 'slingers', 'potty', 'battling',
])

const CONECTORES = new Set(['con', 'de', 'del', 'en', 'a', 'y', 'el', 'la', 'los', 'las', 'al'])

function capitalizar(texto) {
  return texto
    .split(' ')
    .filter(Boolean)
    .map((palabra, i) => {
      if (/[A-ZÁÉÍÓÚÑ]/.test(palabra)) return palabra // ya viene con mayúscula (nombre propio)
      if (i > 0 && CONECTORES.has(palabra)) return palabra
      if (/^[0-9°/.-]+$/.test(palabra)) return palabra // números/símbolos, sin capitalizar
      // capitaliza la primera letra real, preservando paréntesis/puntuación al inicio (ej. "(rodillas")
      return palabra.replace(/^([^a-zà-ÿ]*)([a-zà-ÿ]?)/i, (_, pre, letra) => pre + letra.toUpperCase())
    })
    .join(' ')
}

function extraerEquipos(texto) {
  const equipos = []
  for (const [frase, es] of EQUIPO_FRASES) {
    const re = new RegExp(`\\b${frase}\\b`, 'g')
    if (re.test(texto)) {
      equipos.push(es)
      texto = texto.replace(re, ' ')
    }
  }
  return { texto, equipos }
}

function aplicarFrases(texto) {
  for (const [frase, es] of Object.entries(FRASES_ES)) {
    const re = new RegExp(`\\b${frase}\\b`, 'g')
    texto = texto.replace(re, ` §${es.replace(/ /g, '_')}§ `)
  }
  return texto
}

function traducirTokens(texto, { equiposDestino } = {}) {
  const { texto: sinEquipoFrases, equipos: equiposFrase } = extraerEquipos(texto)
  if (equiposDestino) equiposDestino.push(...equiposFrase)
  const conFrases = aplicarFrases(sinEquipoFrases)

  const tokens = conFrases.split(/\s+/).filter(Boolean)
  const otros = []
  for (const raw of tokens) {
    if (raw.startsWith('§') && raw.endsWith('§')) {
      otros.push(raw.slice(1, -1).replace(/_/g, ' '))
      continue
    }
    const token = raw.replace(/[(),]/g, '')
    if (!token) continue
    if (SKIP_WORDS.has(token)) continue
    if (EQUIPO_PALABRAS[token]) {
      if (equiposDestino) equiposDestino.push(EQUIPO_PALABRAS[token])
      continue
    }
    if (/^[0-9°/.-]+$/.test(token)) {
      otros.push(token)
      continue
    }
    if (token in WORD_ES) {
      const es = WORD_ES[token]
      if (es) otros.push(es)
      continue
    }
    otros.push(token) // desconocida: pasa tal cual (fallback, típicamente nombre propio)
  }
  return otros
}

function traducirNombre(nombreEn) {
  // normaliza un par de erratas del dataset origen: "в°" es mojibake de "°", "_" separa palabras.
  let s = nombreEn.toLowerCase().replace(/[’']/g, '').replace(/-/g, ' ').replace(/в°/g, '°').replace(/_/g, ' ').trim()

  // paréntesis final: se traduce aparte, sin reordenar, y se reapendea al final.
  let sufijo = ''
  const parenMatch = s.match(/\s*\(([^)]+)\)\s*$/)
  if (parenMatch) {
    const parenTraducido = traducirTokens(parenMatch[1]).join(' ')
    if (parenTraducido) sufijo = ` (${parenTraducido})`
    s = s.slice(0, parenMatch.index)
  }

  const equipos = []
  const otros = traducirTokens(s, { equiposDestino: equipos })

  let cuerpo
  if (otros.length === 0) {
    cuerpo = ''
  } else if (otros.length === 1) {
    cuerpo = otros[0]
  } else {
    const cabeza = otros[otros.length - 1]
    cuerpo = [cabeza, ...otros.slice(0, -1)].join(' ')
  }

  const equipoTxt = equipos.length ? ` con ${equipos.join(' y ')}` : ''
  const final = `${cuerpo}${equipoTxt}${sufijo}`.replace(/\s+/g, ' ').trim()
  return capitalizar(final || nombreEn)
}

function traducirLista(valores) {
  return (valores ?? []).map((v) => MUSCULO_ES[v] ?? capitalizar(v))
}

async function fetchTodos(supabase) {
  const PAGE = 1000
  let desde = 0
  const filas = []
  for (;;) {
    const { data, error } = await supabase
      .from('ejercicios')
      .select('id, nombre, categoria, parte_cuerpo, equipo, musculo_principal, musculos_secundarios')
      .order('id')
      .range(desde, desde + PAGE - 1)
    if (error) throw error
    filas.push(...data)
    if (data.length < PAGE) break
    desde += PAGE
  }
  return filas
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
  const filas = await fetchTodos(supabase)
  console.log(`Traduciendo ${filas.length} ejercicios...`)

  const desconocidas = new Set()
  const actualizadas = filas.map((f) => {
    const nombre = traducirNombre(f.nombre)
    for (const w of f.nombre.toLowerCase().replace(/[().,_-]/g, ' ').replace(/в°/g, ' ').split(/\s+/)) {
      if (w && !SKIP_WORDS.has(w) && !EQUIPO_PALABRAS[w] && !(w in WORD_ES) && !/^[0-9°/.-]*$/.test(w)) {
        desconocidas.add(w)
      }
    }
    return {
      id: f.id,
      nombre,
      categoria: PARTE_CUERPO_ES[f.categoria] ?? capitalizar(f.categoria),
      parte_cuerpo: PARTE_CUERPO_ES[f.parte_cuerpo] ?? capitalizar(f.parte_cuerpo),
      equipo: EQUIPO_ENUM_ES[f.equipo] ?? capitalizar(f.equipo),
      musculo_principal: MUSCULO_ES[f.musculo_principal] ?? capitalizar(f.musculo_principal),
      musculos_secundarios: traducirLista(f.musculos_secundarios),
    }
  })

  if (desconocidas.size) {
    console.log(`Palabras sin traducción explícita (quedaron tal cual, capitalizadas): ${[...desconocidas].sort().join(', ')}`)
  }

  if (process.argv.includes('--dry')) {
    console.log('--dry: no se escribe nada. Muestra al azar de 30:')
    const muestra = [...actualizadas].sort(() => Math.random() - 0.5).slice(0, 30)
    for (const f of muestra) console.log(`  ${f.nombre}  [${f.parte_cuerpo} · ${f.equipo}]`)
    return
  }

  const CHUNK = 500
  for (let i = 0; i < actualizadas.length; i += CHUNK) {
    const lote = actualizadas.slice(i, i + CHUNK)
    const { error } = await supabase.from('ejercicios').upsert(lote, { onConflict: 'id' })
    if (error) throw error
    console.log(`  ${Math.min(i + CHUNK, actualizadas.length)}/${actualizadas.length}`)
  }

  console.log('Listo. Ejemplos:')
  for (const f of actualizadas.slice(0, 8)) console.log(`  ${f.nombre}`)
}

function test() {
  assert.equal(traducirNombre('dumbbell incline curl'), 'Curl Inclinado con Mancuerna')
  assert.equal(traducirNombre('barbell seated twist'), 'Giro Sentado con Barra')
  assert.equal(traducirNombre('sit-up'), 'Abdominal')
  assert.equal(traducirNombre('bench dip (knees bent)'), 'Fondo con Banco (Rodillas Flexionado)')
  assert.equal(traducirNombre('smith machine squat'), 'Sentadilla con Máquina Smith')
  assert.equal(PARTE_CUERPO_ES['upper legs'], 'Piernas')
  assert.equal(MUSCULO_ES['hip flexors'], 'Flexores de cadera')
  console.log('traducir-ejercicios: self-check OK')
}

if (process.argv.includes('--test')) {
  test()
} else {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
