import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database.js'
import { authMiddleware } from '../../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

// GET /medications?q=amox  — buscar medicamentos de la clínica
router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q as string)?.trim() ?? ''
    const where: any = { clinicId: req.auth!.clinicId }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { generic: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ]
    }
    const data = await prisma.clinicMedication.findMany({
      where,
      orderBy: { usageCount: 'desc' },
      take: 30,
    })
    res.json({ data })
  } catch (e) {
    next(e)
  }
})

const upsertSchema = z.object({
  name: z.string().min(1),
  generic: z.string().optional(),
  presentation: z.string().optional(),
  defaultDosage: z.string().optional(),
  defaultFrequency: z.string().optional(),
  category: z.string().optional(),
})

// POST /medications — crear o incrementar uso
router.post('/', async (req, res, next) => {
  try {
    const body = upsertSchema.parse(req.body)
    const clinicId = req.auth!.clinicId
    const existing = await prisma.clinicMedication.findFirst({
      where: {
        clinicId,
        name: { equals: body.name, mode: 'insensitive' },
        presentation: body.presentation ?? null,
      },
    })
    if (existing) {
      const updated = await prisma.clinicMedication.update({
        where: { id: existing.id },
        data: { usageCount: { increment: 1 } },
      })
      return res.json(updated)
    }
    const created = await prisma.clinicMedication.create({
      data: { clinicId, ...body } as Prisma.ClinicMedicationUncheckedCreateInput,
    })
    res.status(201).json(created)
  } catch (e) {
    next(e)
  }
})

export default router
