import { Router, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { del, put } from '@vercel/blob'
import { prisma } from '../../config/database.js'
import { authMiddleware } from '../../middleware/auth.js'

// Archivos del paciente (fotos, RX, analíticas, documentos). El binario va a Vercel
// Blob; en la BD solo metadatos + URL. Aislado por clínica. Subida al servidor
// (multer, memoria) con límite práctico de 4 MB (el cliente recomprime imágenes).

const router = Router()
router.use(authMiddleware)

const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf',
])
const CATEGORIES = ['photo', 'rx', 'lab', 'document'] as const
const metaSchema = z.object({ category: z.enum(CATEGORIES) })

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES } })

// Envuelve multer para traducir sus errores (p. ej. tamaño) a 400 en vez de 500.
function uploadSingle(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      const msg = err instanceof Error ? err.message : 'Archivo inválido'
      return res.status(400).json({ error: msg === 'File too large' ? 'El archivo supera los 4 MB' : msg })
    }
    next()
  })
}

// Subir un archivo del paciente.
router.post('/:patientId/files', uploadSingle, async (req, res, next) => {
  try {
    const clinicId = req.auth!.clinicId
    const patient = await prisma.patient.findFirst({
      where: { id: String(req.params.patientId), clinicId },
      select: { id: true },
    })
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' })
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(503).json({ error: 'Almacenamiento de archivos no configurado' })
    }
    const file = req.file
    if (!file) return res.status(400).json({ error: 'Falta el archivo' })
    if (!ALLOWED.has(file.mimetype)) {
      return res.status(400).json({ error: 'Formato no permitido (imágenes o PDF)' })
    }
    const parsed = metaSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" })

    const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : undefined
    const key = `clinic/${clinicId}/patient/${patient.id}/${randomUUID()}${ext ? '.' + ext : ''}`
    const blob = await put(key, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    const row = await prisma.patientFile.create({
      data: {
        clinicId,
        patientId: patient.id,
        uploadedBy: req.auth!.userId,
        category: parsed.data.category,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: blob.url,
      },
    })
    res.status(201).json(row)
  } catch (e) {
    next(e)
  }
})

// Listar archivos del paciente.
router.get('/:patientId/files', async (req, res, next) => {
  try {
    const files = await prisma.patientFile.findMany({
      where: { patientId: String(req.params.patientId), clinicId: req.auth!.clinicId },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ data: files })
  } catch (e) {
    next(e)
  }
})

// Borrar un archivo (Blob + fila).
router.delete('/:patientId/files/:fileId', async (req, res, next) => {
  try {
    const file = await prisma.patientFile.findFirst({
      where: { id: String(req.params.fileId), patientId: String(req.params.patientId), clinicId: req.auth!.clinicId },
    })
    if (!file) return res.status(404).json({ error: 'Archivo no encontrado' })
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await del(file.url, { token: process.env.BLOB_READ_WRITE_TOKEN })
      } catch {
        /* huérfano tolerable: seguimos borrando la fila */
      }
    }
    await prisma.patientFile.delete({ where: { id: file.id } })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
