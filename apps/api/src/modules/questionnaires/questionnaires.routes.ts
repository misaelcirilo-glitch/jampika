import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../../middleware/auth.js'
import { requireModule } from '../../middleware/modules.js'
import { TEMPLATE_LIST } from './templates.js'
import { assign, listForPatient } from './questionnaires.service.js'

// Lado profesional. Auth + módulo 'cuestionarios'. Montado en /api/v1/questionnaires.
const router = Router()
router.use(authMiddleware, requireModule('cuestionarios'))

router.get('/templates', (_req, res) => res.json({ data: TEMPLATE_LIST }))

router.get('/patient/:patientId', async (req, res, next) => {
  try {
    res.json({ data: await listForPatient(req.auth!.clinicId, String(req.params.patientId)) })
  } catch (e) {
    next(e)
  }
})

router.post('/patient/:patientId', async (req, res, next) => {
  try {
    const body = z.object({ templateKey: z.string().optional(), taskTitle: z.string().max(300).optional() }).parse(req.body)
    const r = await assign(req.auth!.clinicId, String(req.params.patientId), req.auth!.userId, body)
    if (!r) return res.status(404).json({ error: 'Paciente no encontrado' })
    if ('error' in r) return res.status(400).json({ error: r.error })
    res.status(201).json(r)
  } catch (e) {
    next(e)
  }
})

export default router
