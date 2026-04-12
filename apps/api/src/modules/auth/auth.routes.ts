import { Router } from 'express'
import { z } from 'zod'
import * as authService from './auth.service.js'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  deviceId: z.string().optional(),
})

router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body)
    const result = await authService.login(body)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

const registerSchema = z.object({
  clinicName: z.string().min(2),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  country: z.enum(['PE', 'CO', 'EC', 'BO', 'MX', 'CL']),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
})

router.post('/register-clinic', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body)
    const clinic = await authService.registerClinic(body)
    res.status(201).json({ id: clinic.id, slug: clinic.slug })
  } catch (e) {
    next(e)
  }
})

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body)
    const result = await authService.refresh(refreshToken)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body)
    await authService.logout(refreshToken)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
