import crypto from 'node:crypto'
import { prisma } from '../../config/database.js'
import { TEMPLATES, scoreScale, type TemplateQuestion } from './templates.js'

const appUrl = () => process.env.APP_URL || 'https://jampika.com'

export interface AssignInput {
  templateKey?: string // escala (phq9|gad7)
  taskTitle?: string // tarea libre
}

function patientLink(id: string, token: string): string {
  return `${appUrl()}/formulario/${id}?t=${token}`
}

export async function assign(clinicId: string, patientId: string, assignedBy: string | null, input: AssignInput) {
  const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId }, select: { id: true } })
  if (!patient) return null

  const token = crypto.randomBytes(16).toString('hex')
  let title: string
  let type: string
  let templateKey: string | null = null
  let questions: TemplateQuestion[]

  const tpl = input.templateKey ? TEMPLATES[input.templateKey] : undefined
  if (tpl) {
    title = tpl.title
    type = 'scale'
    templateKey = tpl.key
    questions = tpl.questions
  } else if (input.taskTitle && input.taskTitle.trim()) {
    title = input.taskTitle.trim()
    type = 'task'
    questions = [{ id: 'respuesta', text: 'Tu respuesta / comentario', kind: 'text' }]
  } else {
    return { error: 'Elige una escala o escribe una tarea' as const }
  }

  const a = await prisma.questionnaireAssignment.create({
    data: {
      clinicId,
      patientId,
      assignedBy,
      title,
      type,
      templateKey,
      questions: questions as unknown as object,
      token,
    },
    select: { id: true, token: true },
  })
  return { id: a.id, token: a.token, patientLink: patientLink(a.id, a.token) }
}

export async function listForPatient(clinicId: string, patientId: string) {
  const rows = await prisma.questionnaireAssignment.findMany({
    where: { clinicId, patientId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, type: true, templateKey: true, status: true, score: true,
      interpretation: true, answers: true, questions: true, token: true, createdAt: true, completedAt: true,
    },
  })
  return rows.map((r) => ({ ...r, patientLink: patientLink(r.id, r.token) }))
}

export async function getPublic(id: string, token: string) {
  const a = await prisma.questionnaireAssignment.findUnique({ where: { id } })
  if (!a || a.token !== token) return null
  const clinic = await prisma.clinic.findUnique({ where: { id: a.clinicId }, select: { name: true } })
  return {
    title: a.title,
    type: a.type,
    status: a.status,
    questions: a.questions,
    clinicName: clinic?.name ?? '',
  }
}

export async function submitPublic(id: string, token: string, answers: Record<string, unknown>) {
  const a = await prisma.questionnaireAssignment.findUnique({ where: { id } })
  if (!a || a.token !== token) return null
  if (a.status === 'completed') return { ok: true, already: true }

  let score: number | null = null
  let interpretation: string | null = null
  const tpl = a.templateKey ? TEMPLATES[a.templateKey] : undefined
  if (a.type === 'scale' && tpl) {
    const r = scoreScale(tpl, answers)
    score = r.score
    interpretation = r.interpretation
  }

  await prisma.questionnaireAssignment.update({
    where: { id },
    data: { answers: answers as unknown as object, score, interpretation, status: 'completed', completedAt: new Date() },
  })
  return { ok: true }
}
