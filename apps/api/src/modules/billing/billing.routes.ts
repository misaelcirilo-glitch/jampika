import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/database.js'
import { authMiddleware } from '../../middleware/auth.js'
import { tipoComprobanteDesdeInvoiceType, AFECTACION_IGV } from '../comprobantes/tipos.js'
import { calcularTotales, validarReceptor } from '../comprobantes/numeracion.js'
import { getEmisor } from '../comprobantes/emisor.js'
import { reservarNumero, inferirTipoDocReceptor } from '../comprobantes/service.js'

const router = Router()
router.use(authMiddleware)

const itemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative(),
  serviceCode: z.string().optional().nullable(),
  // Afectación IGV por ítem: 10 gravado (18%), 20 exonerado, 30 inafecto. Por defecto gravado.
  afectacion: z.enum(['10', '20', '30']).optional(),
})

const invoiceSchema = z.object({
  id: z.string().uuid().optional(),
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional().nullable(),
  invoiceType: z.enum(['boleta', 'factura', 'nota_venta']),
  customerTaxId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  taxRate: z.number().nonnegative().default(18),
  discount: z.number().nonnegative().default(0),
  currency: z.string().default('PEN'),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'yape', 'plin', 'nequi']).optional().nullable(),
  items: z.array(itemSchema).min(1),
})

// ============ CATÁLOGO DE SERVICIOS ============
const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  price: z.number().nonnegative(),
  durationMinutes: z.number().int().positive().default(30),
})

router.get('/services', async (req, res, next) => {
  try {
    const data = await prisma.service.findMany({
      where: { clinicId: req.auth!.clinicId, isActive: true },
      orderBy: { name: 'asc' },
    })
    res.json({ data })
  } catch (e) {
    next(e)
  }
})

router.post('/services', async (req, res, next) => {
  try {
    const body = serviceSchema.parse(req.body)
    const service = await prisma.service.create({
      data: { ...body, clinicId: req.auth!.clinicId },
    })
    res.status(201).json(service)
  } catch (e) {
    next(e)
  }
})

// ============ FACTURAS ============
router.get('/invoices', async (req, res, next) => {
  try {
    const { from, to, status } = req.query as Record<string, string>
    const where: any = { clinicId: req.auth!.clinicId }
    if (status) where.status = status
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }
    const data = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { patient: { select: { firstName: true, lastName: true, documentNumber: true } } },
    })
    res.json({ data })
  } catch (e) {
    next(e)
  }
})

router.get('/invoices/:id', async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, clinicId: req.auth!.clinicId },
      include: { items: true, patient: true },
    })
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' })
    res.json(invoice)
  } catch (e) {
    next(e)
  }
})

router.post('/invoices', async (req, res, next) => {
  try {
    const body = invoiceSchema.parse(req.body)
    const clinicId = req.auth!.clinicId

    // 1. Tipo de comprobante SUNAT + cálculo de importes (IGV por afectación)
    const tipoComprobante = tipoComprobanteDesdeInvoiceType(body.invoiceType)
    const totales = calcularTotales(
      body.items.map((i) => ({
        descripcion: i.description,
        cantidad: i.quantity,
        valorUnitario: i.unitPrice,
        afectacion: i.afectacion ?? AFECTACION_IGV.GRAVADO,
      })),
      body.discount,
    )

    // 2. Validación de receptor según reglas SUNAT (factura->RUC, boleta->DNI/monto)
    const receptorTipoDoc = inferirTipoDocReceptor(tipoComprobante, body.customerTaxId)
    const val = validarReceptor(tipoComprobante, receptorTipoDoc, body.customerTaxId ?? undefined, totales.importeTotal)
    if (!val.ok) return res.status(400).json({ error: val.error })

    // 3. Datos del emisor (la clínica)
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } })
    if (!clinic) return res.status(404).json({ error: 'Clínica no encontrada' })

    // 4. Transacción: reservar correlativo atómico + emitir + persistir
    const invoice = await prisma.$transaction(async (tx) => {
      const { serie, correlativo, numero } = await reservarNumero(tx, clinicId, tipoComprobante)

      const emision = await getEmisor('simulado').emitir({
        tipoComprobante,
        serie,
        correlativo,
        numero,
        fechaEmision: new Date().toISOString(),
        moneda: body.currency,
        emisor: { ruc: clinic.taxId ?? '', razonSocial: clinic.name, direccion: clinic.address ?? undefined },
        receptor: { tipoDoc: receptorTipoDoc, numeroDoc: body.customerTaxId ?? undefined, nombre: body.customerName ?? undefined, direccion: body.customerAddress ?? undefined },
        items: totales.items,
        totales,
      })

      return tx.invoice.create({
        data: {
          id: body.id,
          clinicId,
          patientId: body.patientId,
          appointmentId: body.appointmentId ?? null,
          invoiceNumber: numero,
          invoiceType: body.invoiceType,
          serie,
          correlativo,
          receptorTipoDoc,
          customerTaxId: body.customerTaxId ?? null,
          customerName: body.customerName ?? null,
          customerAddress: body.customerAddress ?? null,
          subtotal: totales.totalGravado + totales.totalExonerado + totales.totalInafecto,
          taxRate: body.taxRate,
          taxAmount: totales.totalIgv,
          discount: totales.totalDescuento,
          total: totales.importeTotal,
          currency: body.currency,
          comprobanteEstado: emision.estado === 'aceptado' ? 'emitido' : emision.estado,
          sunatHash: emision.hash ?? null,
          paymentMethod: body.paymentMethod ?? null,
          items: {
            create: body.items.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              subtotal: i.quantity * i.unitPrice,
              serviceCode: i.serviceCode ?? null,
            })),
          },
        },
        include: { items: true },
      })
    })
    res.status(201).json(invoice)
  } catch (e) {
    next(e)
  }
})

router.post('/invoices/:id/pay', async (req, res, next) => {
  try {
    const { paymentMethod } = z
      .object({ paymentMethod: z.enum(['cash', 'card', 'transfer', 'yape', 'plin', 'nequi']) })
      .parse(req.body)
    const updated = await prisma.invoice.updateMany({
      where: { id: req.params.id, clinicId: req.auth!.clinicId },
      data: { status: 'paid', paymentMethod, paidAt: new Date() },
    })
    if (updated.count === 0) return res.status(404).json({ error: 'Factura no encontrada' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.get('/reports/daily', async (req, res, next) => {
  try {
    const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10)
    const start = new Date(`${date}T00:00:00Z`)
    const end = new Date(`${date}T23:59:59Z`)
    const invoices = await prisma.invoice.findMany({
      where: {
        clinicId: req.auth!.clinicId,
        status: 'paid',
        paidAt: { gte: start, lte: end },
      },
    })
    const totalIncome = invoices.reduce((acc, i) => acc + Number(i.total), 0)
    res.json({
      date,
      totalInvoices: invoices.length,
      totalIncome,
      byMethod: invoices.reduce<Record<string, number>>((acc, i) => {
        const k = i.paymentMethod ?? 'unknown'
        acc[k] = (acc[k] ?? 0) + Number(i.total)
        return acc
      }, {}),
    })
  } catch (e) {
    next(e)
  }
})

export default router
