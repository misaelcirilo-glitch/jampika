import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../../config/database.js'
import { authMiddleware, requireRole } from '../../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

// ============ CLÍNICA ============
const clinicSchema = z.object({
  name: z.string().min(1),
  taxId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  timezone: z.string().optional(),
  country: z.enum(['PE', 'CO', 'EC', 'BO', 'MX', 'CL']).optional(),
  logoUrl: z.string().optional().nullable().or(z.literal('')),
  settings: z.record(z.any()).optional(),
})

router.get('/clinic', async (req, res, next) => {
  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id: req.auth!.clinicId },
    })
    if (!clinic) return res.status(404).json({ error: 'Clínica no encontrada' })
    res.json(clinic)
  } catch (e) {
    next(e)
  }
})

router.put('/clinic', requireRole('admin'), async (req, res, next) => {
  try {
    const body = clinicSchema.parse(req.body)
    const updated = await prisma.clinic.update({
      where: { id: req.auth!.clinicId },
      data: {
        ...body,
        email: body.email || null,
        logoUrl: body.logoUrl || null,
      },
    })
    res.json(updated)
  } catch (e) {
    next(e)
  }
})

// ============ PROFESIONALES / USUARIOS ============
const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['admin', 'doctor', 'receptionist', 'nurse']),
  specialty: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  schedule: z.record(z.any()).optional().nullable(),
})

router.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { clinicId: req.auth!.clinicId },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        specialty: true,
        licenseNumber: true,
        phone: true,
        color: true,
        schedule: true,
        isActive: true,
        lastLogin: true,
      },
    })
    res.json({ data: users })
  } catch (e) {
    next(e)
  }
})

router.post('/users', requireRole('admin'), async (req, res, next) => {
  try {
    const body = userSchema.parse(req.body)
    if (!body.password) {
      return res.status(400).json({ error: 'La contraseña es obligatoria para un nuevo usuario' })
    }
    const passwordHash = await bcrypt.hash(body.password, 10)
    const user = await prisma.user.create({
      data: {
        clinicId: req.auth!.clinicId,
        email: body.email,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        role: body.role,
        specialty: body.specialty ?? null,
        licenseNumber: body.licenseNumber ?? null,
        phone: body.phone ?? null,
        color: body.color ?? null,
        schedule: body.schedule ?? undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        specialty: true,
        color: true,
        schedule: true,
      },
    })
    res.status(201).json(user)
  } catch (e) {
    next(e)
  }
})

router.put('/users/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const body = userSchema.partial().parse(req.body)
    const existing = await prisma.user.findFirst({
      where: { id, clinicId: req.auth!.clinicId },
    })
    if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' })

    const data: any = { ...body }
    delete data.password
    if (body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 10)
    }
    // Evitamos pasar null a schedule (Prisma no lo acepta para Json sin @db.JsonB nullable)
    if (body.schedule === null) delete data.schedule

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        specialty: true,
        color: true,
        schedule: true,
        isActive: true,
      },
    })
    res.json(updated)
  } catch (e) {
    next(e)
  }
})

router.delete('/users/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const id = req.params.id as string
    if (id === req.auth!.userId) {
      return res.status(400).json({ error: 'No puedes desactivar tu propio usuario' })
    }
    await prisma.user.updateMany({
      where: { id, clinicId: req.auth!.clinicId },
      data: { isActive: false },
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
