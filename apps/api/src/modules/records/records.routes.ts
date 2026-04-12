import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/database.js'
import { authMiddleware, requireRole } from '../../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

const diagnosisSchema = z.object({ code: z.string(), description: z.string() })
const prescriptionSchema = z.object({
  medication: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  instructions: z.string().optional(),
})

const recordSchema = z.object({
  id: z.string().uuid().optional(),
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional().nullable(),
  recordType: z.enum(['consultation', 'follow_up', 'emergency', 'procedure', 'lab_result']),
  recordDate: z.string(),
  subjective: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  assessment: z.string().optional().nullable(),
  plan: z.string().optional().nullable(),
  diagnoses: z.array(diagnosisSchema).default([]),
  vitalSigns: z.record(z.any()).default({}),
  prescriptions: z.array(prescriptionSchema).default([]),
  attachments: z.array(z.any()).default([]),
  notes: z.string().optional().nullable(),
})

router.get('/', async (req, res, next) => {
  try {
    const { patientId } = req.query as Record<string, string>
    if (!patientId) return res.status(400).json({ error: 'patientId requerido' })
    const data = await prisma.medicalRecord.findMany({
      where: { clinicId: req.auth!.clinicId, patientId },
      orderBy: { recordDate: 'desc' },
      include: { doctor: { select: { firstName: true, lastName: true, specialty: true } } },
    })
    res.json({ data })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const record = await prisma.medicalRecord.findFirst({
      where: { id: req.params.id, clinicId: req.auth!.clinicId },
      include: { doctor: true, patient: true },
    })
    if (!record) return res.status(404).json({ error: 'Registro no encontrado' })
    res.json(record)
  } catch (e) {
    next(e)
  }
})

// Append-only: solo se crea. Nunca se modifica.
router.post('/', requireRole('doctor', 'admin'), async (req, res, next) => {
  try {
    const body = recordSchema.parse(req.body)
    const clinicId = req.auth!.clinicId
    const record = await prisma.medicalRecord.create({
      data: {
        id: body.id,
        clinicId,
        patientId: body.patientId,
        doctorId: req.auth!.userId,
        appointmentId: body.appointmentId ?? null,
        recordType: body.recordType,
        recordDate: new Date(body.recordDate),
        subjective: body.subjective ?? null,
        objective: body.objective ?? null,
        assessment: body.assessment ?? null,
        plan: body.plan ?? null,
        diagnoses: body.diagnoses,
        vitalSigns: body.vitalSigns,
        prescriptions: body.prescriptions,
        attachments: body.attachments,
        notes: body.notes ?? null,
      },
    })

    // Auto-guardar medicamentos nuevos en el catálogo de la clínica
    for (const p of body.prescriptions) {
      if (!p.medication.trim()) continue
      // Separar nombre y presentación: "Amoxicilina 500 mg" → name="Amoxicilina", presentation="500 mg"
      const parts = p.medication.match(/^(.+?)\s+(\d+\s*.+)$/)
      const name = parts?.[1]?.trim() ?? p.medication.trim()
      const presentation = parts?.[2]?.trim()
      const existing = await prisma.clinicMedication.findFirst({
        where: { clinicId, name: { equals: name, mode: 'insensitive' }, presentation: presentation ?? null },
      })
      if (existing) {
        await prisma.clinicMedication.update({
          where: { id: existing.id },
          data: { usageCount: { increment: 1 } },
        })
      } else {
        await prisma.clinicMedication.create({
          data: {
            clinicId,
            name,
            presentation,
            defaultDosage: p.dosage || undefined,
            defaultFrequency: p.frequency || undefined,
          },
        })
      }
    }

    res.status(201).json(record)
  } catch (e) {
    next(e)
  }
})

router.post('/:id/sign', requireRole('doctor'), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const record = await prisma.medicalRecord.updateMany({
      where: { id, clinicId: req.auth!.clinicId, doctorId: req.auth!.userId },
      data: { isSigned: true, signedAt: new Date() },
    })
    if (record.count === 0) return res.status(404).json({ error: 'Registro no encontrado' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
