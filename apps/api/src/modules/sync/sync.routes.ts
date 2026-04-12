import { Router } from 'express'
import { z } from 'zod'
import type { SyncableTable } from '@jampika/shared'
import { prisma } from '../../config/database.js'
import { authMiddleware } from '../../middleware/auth.js'
import * as syncService from './sync.service.js'

const router = Router()
router.use(authMiddleware)

const SYNCABLE_TABLES: SyncableTable[] = [
  'patients',
  'appointments',
  'medical_records',
  'invoices',
  'invoice_items',
  'services',
  'inventory_items',
  'inventory_movements',
]

const pushSchema = z.object({
  deviceId: z.string().min(1),
  changes: z.array(
    z.object({
      id: z.string(),
      tableName: z.enum([
        'patients',
        'appointments',
        'medical_records',
        'invoices',
        'invoice_items',
        'services',
        'inventory_items',
        'inventory_movements',
      ]),
      recordId: z.string().uuid(),
      operation: z.enum(['INSERT', 'UPDATE', 'DELETE']),
      payload: z.record(z.any()),
      localTimestamp: z.string(),
      retryCount: z.number().int().nonnegative().default(0),
      status: z.enum(['pending', 'syncing', 'synced', 'conflict']).default('pending'),
    }),
  ),
})

router.post('/push', async (req, res, next) => {
  try {
    const body = pushSchema.parse(req.body)
    const result = await syncService.push(req.auth!.clinicId, body)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

router.get('/pull', async (req, res, next) => {
  try {
    const since = new Date((req.query.since as string) ?? '1970-01-01T00:00:00Z')
    const tablesParam = (req.query.tables as string) ?? ''
    const tables = tablesParam
      ? (tablesParam.split(',').filter((t) =>
          SYNCABLE_TABLES.includes(t as SyncableTable),
        ) as SyncableTable[])
      : SYNCABLE_TABLES
    const result = await syncService.pull(req.auth!.clinicId, since, tables)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

router.get('/status', async (req, res, next) => {
  try {
    const lastLog = await prisma.syncLog.findFirst({
      where: { clinicId: req.auth!.clinicId },
      orderBy: { serverTimestamp: 'desc' },
    })
    res.json({
      lastSync: lastLog?.serverTimestamp ?? null,
      pendingChanges: 0,
      status: 'online' as const,
    })
  } catch (e) {
    next(e)
  }
})

export default router
