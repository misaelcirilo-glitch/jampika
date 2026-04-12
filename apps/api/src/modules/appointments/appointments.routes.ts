import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/database.js'
import { authMiddleware } from '../../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

const appointmentSchema = z.object({
  id: z.string().uuid().optional(),
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  startTime: z.string(),
  endTime: z.string(),
  durationMinutes: z.number().int().positive().default(30),
  status: z
    .enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
    .default('scheduled'),
  appointmentType: z.string().optional().nullable(),
  specialty: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

router.get('/', async (req, res, next) => {
  try {
    const { from, to, doctorId, patientId } = req.query as Record<string, string>
    const where: any = { clinicId: req.auth!.clinicId }
    if (doctorId) where.doctorId = doctorId
    if (patientId) where.patientId = patientId
    if (from || to) {
      where.startTime = {}
      if (from) where.startTime.gte = new Date(from)
      if (to) where.startTime.lte = new Date(to)
    }
    const data = await prisma.appointment.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, documentNumber: true } },
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
      },
    })
    res.json({ data })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const appt = await prisma.appointment.findFirst({
      where: { id: req.params.id, clinicId: req.auth!.clinicId },
      include: { patient: true, doctor: true },
    })
    if (!appt) return res.status(404).json({ error: 'Cita no encontrada' })
    res.json(appt)
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const body = appointmentSchema.parse(req.body)
    const appt = await prisma.appointment.create({
      data: {
        ...body,
        id: body.id,
        clinicId: req.auth!.clinicId,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
      },
    })
    res.status(201).json(appt)
  } catch (e) {
    next(e)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const body = appointmentSchema.parse(req.body)
    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.id, clinicId: req.auth!.clinicId },
    })
    if (!existing) return res.status(404).json({ error: 'Cita no encontrada' })

    const appt = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        ...body,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
      },
    })
    res.json(appt)
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.appointment.updateMany({
      where: { id: req.params.id, clinicId: req.auth!.clinicId },
      data: { status: 'cancelled' },
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
