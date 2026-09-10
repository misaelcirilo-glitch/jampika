// Plantillas de cuestionarios (escalas validadas). PRP-017. Las tareas libres NO
// usan plantilla (type='task', el profesional escribe el enunciado).

export interface TemplateQuestion {
  id: string
  text: string
  kind: 'likert' | 'text'
  options?: { label: string; value: number }[]
}
export interface Template {
  key: string
  title: string
  type: 'scale'
  description: string
  questions: TemplateQuestion[]
  bands: { max: number; label: string }[]
}

const LIKERT4 = [
  { label: 'Nunca', value: 0 },
  { label: 'Varios días', value: 1 },
  { label: 'Más de la mitad de los días', value: 2 },
  { label: 'Casi cada día', value: 3 },
]

const likert = (id: string, text: string): TemplateQuestion => ({ id, text, kind: 'likert', options: LIKERT4 })

const PHQ9_ITEMS = [
  'Poco interés o placer en hacer cosas',
  'Se ha sentido decaído/a, deprimido/a o sin esperanzas',
  'Problemas para dormir, o dormir demasiado',
  'Cansancio o sensación de tener poca energía',
  'Poco apetito o comer en exceso',
  'Sentirse mal consigo mismo/a — que es un fracaso o que ha decepcionado a su familia',
  'Dificultad para concentrarse (leer, ver televisión)',
  'Moverse o hablar tan lento que los demás lo notan, o al revés, estar muy inquieto/a',
  'Pensamientos de que estaría mejor muerto/a o de hacerse daño',
]
const GAD7_ITEMS = [
  'Sentirse nervioso/a, ansioso/a o con los nervios de punta',
  'No poder dejar de preocuparse o controlar la preocupación',
  'Preocuparse demasiado por diferentes cosas',
  'Dificultad para relajarse',
  'Estar tan inquieto/a que es difícil quedarse quieto/a',
  'Molestarse o irritarse fácilmente',
  'Sentir miedo como si algo terrible fuera a pasar',
]

export const TEMPLATES: Record<string, Template> = {
  phq9: {
    key: 'phq9',
    title: 'PHQ-9 (Depresión)',
    type: 'scale',
    description: 'En las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas?',
    questions: PHQ9_ITEMS.map((t, i) => likert(`q${i + 1}`, t)),
    bands: [
      { max: 4, label: 'Mínima' },
      { max: 9, label: 'Leve' },
      { max: 14, label: 'Moderada' },
      { max: 19, label: 'Moderada-grave' },
      { max: 27, label: 'Grave' },
    ],
  },
  gad7: {
    key: 'gad7',
    title: 'GAD-7 (Ansiedad)',
    type: 'scale',
    description: 'En las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas?',
    questions: GAD7_ITEMS.map((t, i) => likert(`q${i + 1}`, t)),
    bands: [
      { max: 4, label: 'Mínima' },
      { max: 9, label: 'Leve' },
      { max: 14, label: 'Moderada' },
      { max: 21, label: 'Grave' },
    ],
  },
}

export const TEMPLATE_LIST = Object.values(TEMPLATES).map((t) => ({ key: t.key, title: t.title }))

// Suma likert + banda interpretativa. answers = { [questionId]: number }.
export function scoreScale(template: Template, answers: Record<string, unknown>): { score: number; interpretation: string } {
  let score = 0
  for (const q of template.questions) {
    if (q.kind === 'likert') {
      const v = Number(answers[q.id])
      if (!Number.isNaN(v)) score += v
    }
  }
  const band = template.bands.find((b) => score <= b.max)
  return { score, interpretation: band ? band.label : String(score) }
}
