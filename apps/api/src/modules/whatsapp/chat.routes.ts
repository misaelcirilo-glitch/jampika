import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../../middleware/auth.js'
import { requireModule } from '../../middleware/modules.js'
import { getMessages, listConversations, sendMessage } from './whatsapp.service.js'

// Inbox de chat (add-on de pago). Requiere sesión + módulo 'chat'. Tenant-scoped.
const router = Router()
router.use(authMiddleware, requireModule('chat'))

router.get('/conversations', async (req, res, next) => {
  try {
    res.json({ data: await listConversations(req.auth!.clinicId) })
  } catch (e) {
    next(e)
  }
})

router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const r = await getMessages(req.auth!.clinicId, String(req.params.id))
    if (!r) return res.status(404).json({ error: 'Conversación no encontrada' })
    res.json(r)
  } catch (e) {
    next(e)
  }
})

router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { body } = z.object({ body: z.string().min(1).max(4000) }).parse(req.body)
    const m = await sendMessage(req.auth!.clinicId, String(req.params.id), body)
    if (!m) return res.status(404).json({ error: 'Conversación no encontrada' })
    res.status(201).json(m)
  } catch (e) {
    next(e)
  }
})

export default router
