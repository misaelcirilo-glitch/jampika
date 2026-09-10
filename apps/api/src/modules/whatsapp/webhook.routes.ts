import { Router } from 'express'
import { ingestInbound } from './whatsapp.service.js'

// Webhook público de WhatsApp Cloud API (Meta). GET = verificación; POST = mensajes.
// Enruta al tenant por metadata.phone_number_id (whatsapp.service). Sin authMiddleware.
const router = Router()

router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(String(challenge ?? ''))
  }
  return res.sendStatus(403)
})

// Estructura mínima del payload de Cloud API que nos interesa.
interface WaTextMsg {
  from?: string
  id?: string
  type?: string
  text?: { body?: string }
  button?: { text?: string }
  interactive?: { button_reply?: { title?: string } }
}
interface WaChange {
  value?: { metadata?: { phone_number_id?: string }; messages?: WaTextMsg[] }
}
interface WaEntry {
  changes?: WaChange[]
}
interface WaWebhookBody {
  entry?: WaEntry[]
}

router.post('/webhook', async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as WaWebhookBody
    for (const e of body.entry ?? []) {
      for (const change of e.changes ?? []) {
        const phoneId = change.value?.metadata?.phone_number_id
        for (const msg of change.value?.messages ?? []) {
          const from = msg.from
          const type = msg.type ?? 'text'
          const text =
            msg.text?.body ??
            msg.button?.text ??
            msg.interactive?.button_reply?.title ??
            `[${type}]`
          if (phoneId && from) {
            await ingestInbound({ phoneId, from, text, type, waMessageId: msg.id })
          }
        }
      }
    }
    res.sendStatus(200)
  } catch (e) {
    next(e)
  }
})

export default router
