import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.js'
import { requireModule } from '../../middleware/modules.js'
import { getForClinic } from './video.service.js'

// Lado profesional (autenticado + módulo telemedicina). Montado en /api/v1/appointments.
const router = Router()
router.use(authMiddleware, requireModule('telemedicina'))

router.get('/:id/video', async (req, res, next) => {
  try {
    const r = await getForClinic(req.auth!.clinicId, String(req.params.id))
    if (!r) return res.status(404).json({ error: 'Cita no encontrada' })
    res.json(r)
  } catch (e) {
    next(e)
  }
})

export default router
