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

// Config de WhatsApp POR CLÍNICA (modelo Verioska: número por tenant). El token suele
// ser el System User compartido (env); phoneId/template pueden ser propios del tenant.
// Todo opcional: lo no provisto cae al env compartido.
export interface WhatsAppConfig {
  token?: string
  phoneId?: string
  template?: string
  lang?: string
}

const GRAPH_VERSION = 'v21.0'

export async function sendAppointmentReminder(
  msg: ReminderMessage,
  config?: WhatsAppConfig,
): Promise<SendResult> {
  const token = config?.token || process.env.WHATSAPP_TOKEN
  const phoneId = config?.phoneId || process.env.WHATSAPP_PHONE_ID
  const template = config?.template || process.env.WHATSAPP_TEMPLATE
  const lang = config?.lang || process.env.WHATSAPP_TEMPLATE_LANG || 'es'

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

// Envío de texto libre (solo válido dentro de la ventana de 24h de WhatsApp; fuera de
// ella la API real exige plantilla). Usado por el inbox de chat.
export async function sendText(to: string, body: string, config?: WhatsAppConfig): Promise<SendResult> {
  const token = config?.token || process.env.WHATSAPP_TOKEN
  const phoneId = config?.phoneId || process.env.WHATSAPP_PHONE_ID
  if (!token || !phoneId) {
    console.log(`[wa:simulado:text] to=${to} body="${body.slice(0, 80)}"`)
    return { ok: true, simulated: true }
  }
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`WhatsApp ${res.status}: ${t.slice(0, 300)}`)
  }
  return { ok: true, simulated: false }
}
