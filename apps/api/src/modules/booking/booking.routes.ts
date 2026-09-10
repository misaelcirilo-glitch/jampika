import { Router } from 'express'
import { z } from 'zod'
import { createBooking, getAvailability, getPublicInfo } from './booking.service.js'

// Reserva online PÚBLICA (sin auth). Montado en /api/v1/public/booking.
const router = Router()

router.get('/:slug', async (req, res, next) => {
  try {
    const info = await getPublicInfo(String(req.params.slug))
    if (!info) return res.status(404).json({ error: 'No encontrado' })
    res.json(info)
  } catch (e) {
    next(e)
  }
})

router.get('/:slug/availability', async (req, res, next) => {
  try {
    const q = z
      .object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), days: z.coerce.number().min(1).max(30).default(14) })
      .parse(req.query)
    const slots = await getAvailability(String(req.params.slug), q.from, q.days)
    res.json({ data: slots })
  } catch (e) {
    next(e)
  }
})

router.post('/:slug', async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(2).max(120),
        phone: z.string().min(6).max(30),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/),
      })
      .parse(req.body)
    const result = await createBooking(String(req.params.slug), body)
    if (!result.ok) return res.status(409).json({ error: result.error })
    res.status(201).json(result)
  } catch (e) {
    next(e)
  }
})

export default router
