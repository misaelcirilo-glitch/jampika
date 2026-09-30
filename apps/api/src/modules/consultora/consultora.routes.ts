import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware, requireRole } from '../../middleware/auth.js'
import { enviarMensaje, listarHistorial } from './consultora.service.js'

// Consultora Senior: consultoría de gestión clínica con contexto real de la
// clínica. Solo admin/doctor (decisiones de gestión). Montado en /api/v1/consultora.
const router = Router()
router.use(authMiddleware, requireRole('admin', 'doctor'))

router.get('/', async (req, res, next) => {
  try {
    const mensajes = await listarHistorial(req.auth!.clinicId, req.auth!.userId)
    res.json({ data: { mensajes } })
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const body = z.object({ mensaje: z.string().trim().min(2).max(2000) }).parse(req.body)
    const { respuesta, usandoIA } = await enviarMensaje(req.auth!.clinicId, req.auth!.userId, body.mensaje)
    res.json({ data: { respuesta, usandoIA } })
  } catch (e) {
    next(e)
  }
})

export default router
