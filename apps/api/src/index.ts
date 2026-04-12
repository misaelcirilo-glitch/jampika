import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import authRoutes from './modules/auth/auth.routes.js'
import patientsRoutes from './modules/patients/patients.routes.js'
import appointmentsRoutes from './modules/appointments/appointments.routes.js'
import recordsRoutes from './modules/records/records.routes.js'
import billingRoutes from './modules/billing/billing.routes.js'
import medicationsRoutes from './modules/medications/medications.routes.js'
import inventoryRoutes from './modules/inventory/inventory.routes.js'
import dashboardRoutes from './modules/dashboard/dashboard.routes.js'
import settingsRoutes from './modules/settings/settings.routes.js'
import syncRoutes from './modules/sync/sync.routes.js'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  }),
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
  }),
)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'jampika-api', timestamp: new Date().toISOString() })
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/patients', patientsRoutes)
app.use('/api/v1/appointments', appointmentsRoutes)
app.use('/api/v1/records', recordsRoutes)
app.use('/api/v1/medications', medicationsRoutes)
app.use('/api/v1/billing', billingRoutes)
app.use('/api/v1/inventory', inventoryRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1/settings', settingsRoutes)
app.use('/api/v1/sync', syncRoutes)

app.use(errorHandler)

// En producción (Vercel) se exporta, en local se escucha
if (process.env.VERCEL !== '1') {
  app.listen(env.PORT, () => {
    console.log(`\ud83d\ude80 Jampika API escuchando en http://localhost:${env.PORT}`)
  })
}

export default app
