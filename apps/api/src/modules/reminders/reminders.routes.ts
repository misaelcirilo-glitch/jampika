import { Router, type Request, type Response, type NextFunction } from 'express'
import { runReminders } from './reminders.service.js'

// Endpoint disparado por Vercel Cron (NO usa authMiddleware). Vercel Cron hace GET
// y envía `Authorization: Bearer <CRON_SECRET>` si CRON_SECRET está en env; también
// aceptamos `x-cron-secret` para pruebas manuales. Se soportan GET y POST.
const router = Router()

async function handleRun(req: Request, res: Response, next: NextFunction) {
  try {
    const secret = process.env.CRON_SECRET
    const provided =
      req.header('x-cron-secret') ?? req.header('authorization')?.replace(/^Bearer\s+/i, '')
    if (!secret || provided !== secret) {
      return res.status(401).json({ error: 'No autorizado' })
    }
    const result = await runReminders()
    res.json(result)
  } catch (e) {
    next(e)
  }
}

router.get('/run', handleRun)
router.post('/run', handleRun)

export default router
