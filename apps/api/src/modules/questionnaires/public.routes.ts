import { Router } from 'express'
import { z } from 'zod'
import { getPublic, submitPublic } from './questionnaires.service.js'

// Lado paciente (público). Montado en /api/v1/public/questionnaire. Valida token.
const router = Router()

router.get('/:id', async (req, res, next) => {
  try {
    const r = await getPublic(String(req.params.id), String(req.query.t ?? ''))
    if (!r) return res.status(404).json({ error: 'No disponible' })
    res.json(r)
  } catch (e) {
    next(e)
  }
})

router.post('/:id', async (req, res, next) => {
  try {
    const body = z.object({ answers: z.record(z.string(), z.unknown()) }).parse(req.body)
    const r = await submitPublic(String(req.params.id), String(req.query.t ?? ''), body.answers)
    if (!r) return res.status(404).json({ error: 'No disponible' })
    res.json(r)
  } catch (e) {
    next(e)
  }
})

export default router
