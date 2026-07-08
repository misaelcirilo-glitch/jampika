import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/database.js'
import { authMiddleware } from '../../middleware/auth.js'
import { tipoComprobanteDesdeInvoiceType, afectacionCodigo } from '../comprobantes/tipos.js'
import { calcularTotales, validarReceptor } from '../comprobantes/numeracion.js'
import { getEmisor } from '../comprobantes/emisor.js'
import { reservarNumero, inferirTipoDocReceptor } from '../comprobantes/service.js'
import {
  construirRegistroVentas,
  registroVentasToCsv,
  type InvoiceParaRegistro,
} from '../comprobantes/registro-ventas.js'

const router = Router()
router.use(authMiddleware)

const itemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative(),
  serviceCode: z.string().optional().nullable(),
  // Afectación IGV por ítem: gravado (18%) | exonerado | inafecto. Por defecto gravado.
  afectacionIgv: z.enum(['gravado', 'exonerado', 'inafecto']).default('gravado'),
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
        afectacion: afectacionCodigo(i.afectacionIgv),
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
              afectacionIgv: i.afectacionIgv,
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

// ============ REGISTRO DE VENTAS SUNAT (export para el contador) ============
// El contador carga este archivo en su Facturador SUNAT / software contable
// mientras no exista conexión directa a un OSE/PSE.
const registroVentasQuery = z
  .object({
    periodo: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'periodo debe ser YYYY-MM')
      .optional(),
    desde: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'desde debe ser YYYY-MM-DD')
      .optional(),
    hasta: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'hasta debe ser YYYY-MM-DD')
      .optional(),
    formato: z.enum(['json', 'csv']).default('json'),
  })
  .refine((v) => Boolean(v.periodo) || Boolean(v.desde && v.hasta), {
    message: 'Indica periodo (YYYY-MM) o el rango desde+hasta (YYYY-MM-DD)',
  })

/** Resuelve el rango [start, end) en UTC a partir de periodo o desde/hasta. */
function rangoFechas(q: z.infer<typeof registroVentasQuery>): { start: Date; end: Date; etiqueta: string } {
  if (q.periodo) {
    const [y, m] = q.periodo.split('-').map(Number) as [number, number]
    return {
      start: new Date(Date.UTC(y, m - 1, 1)),
      end: new Date(Date.UTC(y, m, 1)),
      etiqueta: q.periodo,
    }
  }
  const start = new Date(`${q.desde}T00:00:00.000Z`)
  const end = new Date(`${q.hasta}T00:00:00.000Z`)
  end.setUTCDate(end.getUTCDate() + 1) // rango inclusivo del día 'hasta'
  return { start, end, etiqueta: `${q.desde}_${q.hasta}` }
}

router.get('/registro-ventas', async (req, res, next) => {
  try {
    const q = registroVentasQuery.parse(req.query)
    const { start, end, etiqueta } = rangoFechas(q)

    const invoices = await prisma.invoice.findMany({
      where: {
        clinicId: req.auth!.clinicId,
        serie: { not: null }, // solo comprobantes emitidos (con serie/correlativo)
        correlativo: { not: null },
        createdAt: { gte: start, lt: end },
      },
      orderBy: [{ createdAt: 'asc' }, { correlativo: 'asc' }],
      include: { items: { select: { subtotal: true, afectacionIgv: true } } },
    })

    const entradas: InvoiceParaRegistro[] = invoices.map((i) => ({
      createdAt: i.createdAt,
      invoiceType: i.invoiceType,
      serie: i.serie!,
      correlativo: i.correlativo!,
      receptorTipoDoc: i.receptorTipoDoc,
      customerTaxId: i.customerTaxId,
      customerName: i.customerName,
      taxAmount: Number(i.taxAmount),
      discount: Number(i.discount),
      total: Number(i.total),
      currency: i.currency,
      items: i.items.map((it) => ({ subtotal: Number(it.subtotal), afectacionIgv: it.afectacionIgv })),
    }))

    const registro = construirRegistroVentas(entradas)

    if (q.formato === 'csv') {
      const csv = registroVentasToCsv(registro)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="registro-ventas-${etiqueta}.csv"`)
      return res.send('﻿' + csv) // BOM para que Excel respete acentos
    }

    return res.json({ periodo: q.periodo ?? null, desde: q.desde ?? null, hasta: q.hasta ?? null, ...registro })
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
