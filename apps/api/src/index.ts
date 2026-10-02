import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import authRoutes from './modules/auth/auth.routes.js'
import patientsRoutes from './modules/patients/patients.routes.js'
import filesRoutes from './modules/files/files.routes.js'
import appointmentsRoutes from './modules/appointments/appointments.routes.js'
import recordsRoutes from './modules/records/records.routes.js'
import billingRoutes from './modules/billing/billing.routes.js'
import medicationsRoutes from './modules/medications/medications.routes.js'
import inventoryRoutes from './modules/inventory/inventory.routes.js'
import dashboardRoutes from './modules/dashboard/dashboard.routes.js'
import settingsRoutes from './modules/settings/settings.routes.js'
import syncRoutes from './modules/sync/sync.routes.js'
import remindersRoutes from './modules/reminders/reminders.routes.js'
import whatsappWebhookRoutes from './modules/whatsapp/webhook.routes.js'
import whatsappChatRoutes from './modules/whatsapp/chat.routes.js'
import bookingRoutes from './modules/booking/booking.routes.js'
import videoRoutes from './modules/telemedicine/video.routes.js'
import publicVideoRoutes from './modules/telemedicine/public.routes.js'
import questionnairesRoutes from './modules/questionnaires/questionnaires.routes.js'
import publicQuestionnaireRoutes from './modules/questionnaires/public.routes.js'
import subscriptionRoutes from './modules/subscription/subscription.routes.js'
import { stripeWebhookHandler } from './modules/subscription/webhook.js'
import rdaCoRoutes from './modules/rda-co/rda.routes.js'
import consultoraRoutes from './modules/consultora/consultora.routes.js'
import kpisRoutes from './modules/kpis/kpis.routes.js'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  }),
)
// Webhook de Stripe: cuerpo CRUDO ANTES del express.json (la firma necesita el body
// sin parsear). El resto de la app sigue usando express.json normal.
app.post(
  '/api/v1/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler,
)

app.use(express.json({ limit: '10mb' }))
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))

app.use(
  '/api/v1',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' },
  }),
)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'jampika-api', timestamp: new Date().toISOString() })
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/patients', patientsRoutes)
app.use('/api/v1/patients', filesRoutes) // archivos del paciente (sub-recurso)
app.use('/api/v1/appointments', appointmentsRoutes)
app.use('/api/v1/appointments', videoRoutes) // GET /:id/video (telemedicina, auth + módulo)
app.use('/api/v1/records', recordsRoutes)
app.use('/api/v1/medications', medicationsRoutes)
app.use('/api/v1/billing', billingRoutes)
app.use('/api/v1/inventory', inventoryRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1/settings', settingsRoutes)
app.use('/api/v1/sync', syncRoutes)
app.use('/api/v1/reminders', remindersRoutes)
app.use('/api/v1/whatsapp', whatsappWebhookRoutes) // webhook público (verify + inbound)
app.use('/api/v1/whatsapp/chat', whatsappChatRoutes) // inbox (auth + módulo chat)
app.use('/api/v1/public/booking', bookingRoutes) // reserva online pública (sin auth)
app.use('/api/v1/public/video', publicVideoRoutes) // videoconsulta pública (token HMAC)
app.use('/api/v1/questionnaires', questionnairesRoutes) // cuestionarios/tareas (auth + módulo)
app.use('/api/v1/public/questionnaire', publicQuestionnaireRoutes) // responder (público, token)
app.use('/api/v1/stripe', subscriptionRoutes) // suscripción de plataforma (auth; el webhook va arriba)
app.use('/api/v1/rda-co', rdaCoRoutes) // RDA Colombia: Bundle FHIR local (sin envío a Minsalud)
app.use('/api/v1/consultora', consultoraRoutes) // Consultora Senior: consultoría de gestión clínica (auth admin/doctor)
app.use('/api/v1/kpis', kpisRoutes) // Indicadores de gestión (auth admin/doctor; mismo cálculo que la consultora)

// Rutas inexistentes: JSON en español (no el "Cannot GET" de Express).
app.use((_req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado' })
})

app.use(errorHandler)

// En producción (Vercel) se exporta, en local se escucha
if (process.env.VERCEL !== '1') {
  app.listen(env.PORT, () => {
    console.log(`\ud83d\ude80 Jampika API escuchando en http://localhost:${env.PORT}`)
  })
}

export default app
