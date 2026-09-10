import { Router } from 'express'
import { getPublic } from './video.service.js'

// Lado paciente (público). Montado en /api/v1/public/video. Valida token HMAC.
const router = Router()

router.get('/:id', async (req, res, next) => {
  try {
    const token = String(req.query.t ?? '')
    const r = await getPublic(String(req.params.id), token)
    if (!r) return res.status(404).json({ error: 'Videoconsulta no disponible' })
    res.json(r)
  } catch (e) {
    next(e)
  }
})

export default router
