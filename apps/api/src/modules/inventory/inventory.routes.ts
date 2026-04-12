import { Router } from 'express'
import { z } from 'zod'
import Tesseract from 'tesseract.js'
import { prisma } from '../../config/database.js'
import { authMiddleware } from '../../middleware/auth.js'
import { parseInvoiceText } from './lib/invoice-parser.js'
import { classifyProduct } from './lib/categories.js'

const router = Router()
router.use(authMiddleware)

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  genericName: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  currentStock: z.number().int().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(5),
  unit: z.string().optional().nullable(),
  purchasePrice: z.number().nonnegative().optional().nullable(),
  salePrice: z.number().nonnegative().optional().nullable(),
  expirationDate: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
})

router.get('/items', async (req, res, next) => {
  try {
    const data = await prisma.inventoryItem.findMany({
      where: { clinicId: req.auth!.clinicId, isActive: true },
      orderBy: { name: 'asc' },
    })
    res.json({ data })
  } catch (e) {
    next(e)
  }
})

router.get('/items/low-stock', async (req, res, next) => {
  try {
    const items = await prisma.$queryRaw<any[]>`
      SELECT * FROM inventory_items
      WHERE clinic_id = ${req.auth!.clinicId}::uuid
        AND is_active = true
        AND current_stock <= min_stock
      ORDER BY name ASC
    `
    res.json({ data: items })
  } catch (e) {
    next(e)
  }
})

router.post('/items', async (req, res, next) => {
  try {
    const body = itemSchema.parse(req.body)
    const item = await prisma.inventoryItem.create({
      data: {
        ...body,
        id: body.id,
        clinicId: req.auth!.clinicId,
        expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
      },
    })
    res.status(201).json(item)
  } catch (e) {
    next(e)
  }
})

router.put('/items/:id', async (req, res, next) => {
  try {
    const body = itemSchema.parse(req.body)
    const existing = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, clinicId: req.auth!.clinicId },
    })
    if (!existing) return res.status(404).json({ error: 'Item no encontrado' })
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: {
        ...body,
        expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
      },
    })
    res.json(item)
  } catch (e) {
    next(e)
  }
})

const movementSchema = z.object({
  itemId: z.string().uuid(),
  movementType: z.enum(['in', 'out', 'adjustment', 'expired']),
  quantity: z.number().int(),
  reason: z.string().optional().nullable(),
  patientId: z.string().uuid().optional().nullable(),
})

router.post('/movements', async (req, res, next) => {
  try {
    const body = movementSchema.parse(req.body)
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirst({
        where: { id: body.itemId, clinicId: req.auth!.clinicId },
      })
      if (!item) throw new Error('Item no encontrado')

      const delta = body.movementType === 'in' ? body.quantity : -Math.abs(body.quantity)
      const newStock = Math.max(0, item.currentStock + delta)

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: newStock },
      })

      return tx.inventoryMovement.create({
        data: {
          clinicId: req.auth!.clinicId,
          itemId: body.itemId,
          movementType: body.movementType,
          quantity: body.quantity,
          reason: body.reason ?? null,
          patientId: body.patientId ?? null,
          userId: req.auth!.userId,
        },
      })
    })
    res.status(201).json(result)
  } catch (e) {
    next(e)
  }
})

// ============================================================
// SCAN: OCR de factura → extracción de items
// ============================================================

router.post('/scan', async (req, res, next) => {
  try {
    const { image } = req.body as { image?: string }
    if (!image) return res.status(400).json({ error: 'Se requiere campo image (base64)' })

    // Soporta "data:image/...;base64,XXXX" o base64 crudo
    const base64Data = image.includes(',') ? image.split(',')[1]! : image
    const buffer = Buffer.from(base64Data, 'base64')

    const { data: { text } } = await Tesseract.recognize(buffer, 'spa+eng', {
      logger: () => {},
    })

    const result = parseInvoiceText(text)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

// ============================================================
// BULK: crear varios items de inventario + movimientos de entrada
// ============================================================

const bulkItemSchema = z.object({
  name: z.string().min(1),
  genericName: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  quantity: z.number().int().positive(),
  unit: z.string().optional().nullable(),
  purchasePrice: z.number().nonnegative().optional().nullable(),
  expirationDate: z.string().optional().nullable(),
  lot: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
})

router.post('/bulk', async (req, res, next) => {
  try {
    const { items } = z.object({ items: z.array(bulkItemSchema).min(1) }).parse(req.body)
    const clinicId = req.auth!.clinicId
    const userId = req.auth!.userId

    const created = await prisma.$transaction(async (tx) => {
      const results = []
      for (const item of items) {
        // Auto-clasificar si no tiene categoría
        const category = item.category || classifyProduct(item.name)

        // Buscar si ya existe en inventario (mismo nombre + misma presentación)
        const existing = await tx.inventoryItem.findFirst({
          where: {
            clinicId,
            name: { equals: item.name, mode: 'insensitive' },
            isActive: true,
          },
        })

        let inventoryItem
        if (existing) {
          // Actualizar stock del existente
          inventoryItem = await tx.inventoryItem.update({
            where: { id: existing.id },
            data: {
              currentStock: existing.currentStock + item.quantity,
              purchasePrice: item.purchasePrice ?? existing.purchasePrice,
              supplier: item.supplier ?? existing.supplier,
              expirationDate: item.expirationDate ? new Date(item.expirationDate) : existing.expirationDate,
              category: category !== 'Sin categoría' ? category : existing.category,
            },
          })
        } else {
          // Crear nuevo item
          inventoryItem = await tx.inventoryItem.create({
            data: {
              clinicId,
              name: item.name,
              genericName: item.genericName ?? null,
              category,
              currentStock: item.quantity,
              minStock: 5,
              unit: item.unit ?? 'unidad',
              purchasePrice: item.purchasePrice ?? null,
              supplier: item.supplier ?? null,
              expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
              location: item.lot ?? null, // Usamos location para guardar el lote
            },
          })
        }

        // Registrar movimiento de entrada
        await tx.inventoryMovement.create({
          data: {
            clinicId,
            itemId: inventoryItem.id,
            movementType: 'in',
            quantity: item.quantity,
            reason: item.supplier ? `Factura proveedor: ${item.supplier}` : 'Ingreso por escaneo de factura',
            userId,
          },
        })

        results.push(inventoryItem)
      }
      return results
    })

    res.status(201).json({ data: created, count: created.length })
  } catch (e) {
    next(e)
  }
})

export default router
