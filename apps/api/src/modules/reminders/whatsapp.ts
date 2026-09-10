// Envío de recordatorios por WhatsApp Cloud API. Si faltan credenciales, cae a
// modo SIMULADO (log, no envía) → todo es construible/desplegable sin creds; el
// envío real se enciende al poner WHATSAPP_TOKEN/WHATSAPP_PHONE_ID/WHATSAPP_TEMPLATE.

export interface ReminderMessage {
  to: string // teléfono en formato internacional, solo dígitos (p.ej. 51987654321)
  patientName: string
  clinicName: string
  whenText: string // fecha/hora legible en la zona de la clínica
}

export interface SendResult {
  ok: boolean
  simulated: boolean
}

const GRAPH_VERSION = 'v21.0'

export async function sendAppointmentReminder(msg: ReminderMessage): Promise<SendResult> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_ID
  const template = process.env.WHATSAPP_TEMPLATE
  const lang = process.env.WHATSAPP_TEMPLATE_LANG ?? 'es'

  if (!token || !phoneId || !template) {
    console.log(
      `[reminder:simulado] to=${msg.to} paciente="${msg.patientName}" clínica="${msg.clinicName}" cuándo="${msg.whenText}"`,
    )
    return { ok: true, simulated: true }
  }

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: msg.to,
      type: 'template',
      template: {
        name: template,
        language: { code: lang },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: msg.patientName },
              { type: 'text', text: msg.clinicName },
              { type: 'text', text: msg.whenText },
            ],
          },
        ],
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`WhatsApp ${res.status}: ${body.slice(0, 300)}`)
  }
  return { ok: true, simulated: false }
}
