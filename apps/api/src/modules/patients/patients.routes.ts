import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database.js'
import { authMiddleware } from '../../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

const patientSchema = z.object({
  id: z.string().uuid().optional(),
  documentType: z.string(),
  documentNumber: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z.string().optional().nullable(),
  gender: z.enum(['M', 'F', 'other']).optional().nullable(),
  bloodType: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  insuranceProvider: z.string().optional().nullable(),
  insuranceNumber: z.string().optional().nullable(),
  allergies: z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
})

router.get('/', async (req, res, next) => {
  try {
    const { search, page = '1', limit = '50' } = req.query as Record<string, string>
    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)))

    const where: any = { clinicId: req.auth!.clinicId, isActive: true }
    if (search) {
      where.OR = [
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: { lastName: 'asc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.patient.count({ where }),
    ])

    res.json({ data, total, page: pageNum, limit: limitNum })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { id: req.params.id, clinicId: req.auth!.clinicId },
      include: {
        medicalRecords: { orderBy: { recordDate: 'desc' }, take: 20 },
        appointments: { orderBy: { startTime: 'desc' }, take: 10 },
      },
    })
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' })
    res.json(patient)
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const body = patientSchema.parse(req.body)
    const patient = await prisma.patient.create({
      // Cast a UncheckedCreateInput: fija la variante con clinicId escalar y evita
      // que la inferencia (más estricta en el runtime de Vercel) tome la variante
      // relacional donde clinicId es `never`.
      data: {
        ...body,
        id: body.id,
        clinicId: req.auth!.clinicId,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        email: body.email || null,
      } as Prisma.PatientUncheckedCreateInput,
    })
    res.status(201).json(patient)
  } catch (e) {
    next(e)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const body = patientSchema.parse(req.body)
    const existing = await prisma.patient.findFirst({
      where: { id: req.params.id, clinicId: req.auth!.clinicId },
    })
    if (!existing) return res.status(404).json({ error: 'Paciente no encontrado' })

    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: {
        ...body,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        email: body.email || null,
      },
    })
    res.json(patient)
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.patient.updateMany({
      where: { id: req.params.id, clinicId: req.auth!.clinicId },
      data: { isActive: false },
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
