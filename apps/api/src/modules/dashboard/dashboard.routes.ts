import { Router } from 'express'
import { prisma } from '../../config/database.js'
import { authMiddleware } from '../../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

router.get('/summary', async (req, res, next) => {
  try {
    const clinicId = req.auth!.clinicId
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const [appointmentsToday, patientsTotal, invoicesToday, lowStockCount] = await Promise.all([
      prisma.appointment.count({
        where: { clinicId, startTime: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.patient.count({ where: { clinicId, isActive: true } }),
      prisma.invoice.findMany({
        where: {
          clinicId,
          status: 'paid',
          paidAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM inventory_items
        WHERE clinic_id = ${clinicId}::uuid AND is_active = true AND current_stock <= min_stock
      `,
    ])

    const incomeToday = invoicesToday.reduce((acc, i) => acc + Number(i.total), 0)

    res.json({
      appointmentsToday,
      patientsTotal,
      incomeToday,
      invoicesToday: invoicesToday.length,
      lowStockItems: Number(lowStockCount[0]?.count ?? 0),
    })
  } catch (e) {
    next(e)
  }
})

export default router
