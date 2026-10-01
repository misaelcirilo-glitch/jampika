import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware, requireRole } from '../../middleware/auth.js'
import { calcularSnapshotKpis, guardarConfigKpis } from './kpis.service.js'
import { GUIA_KPIS } from './kpis.guia.js'

// Indicadores (KPIs) de gestión. Mismo cálculo que usa la Consultora Senior.
// Montado en /api/v1/kpis. Solo admin/doctor (como la consultora).
const router = Router()
router.use(authMiddleware, requireRole('admin', 'doctor'))

const querySchema = z.object({
  periodo: z.enum(['semana', 'mes', 'trimestre', 'anio']).default('mes'),
  profesionalId: z.string().uuid().optional(),
})

router.get('/', async (req, res, next) => {
  try {
    const q = querySchema.parse(req.query)
    // Todas las consultas filtran por clinicId del JWT: un profesionalId ajeno solo da vacío.
    const data = await calcularSnapshotKpis(req.auth!.clinicId, { periodo: q.periodo, profesionalId: q.profesionalId ?? null })
    res.json({ data, guia: GUIA_KPIS })
  } catch (e) {
    next(e)
  }
})

const configSchema = z
  .object({
    costoHoraConsulta: z.number().min(0).max(100_000).nullable().optional(),
    costosFijosMensuales: z.number().min(0).max(100_000_000).nullable().optional(),
  })
  .strict()

router.put('/config', requireRole('admin'), async (req, res, next) => {
  try {
    const body = configSchema.parse(req.body)
    const config = await guardarConfigKpis(req.auth!.clinicId, body)
    res.json({ data: { config } })
  } catch (e) {
    next(e)
  }
})

export default router
