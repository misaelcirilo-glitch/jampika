import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

/** Error pensado para el usuario: su mensaje (en español) se devuelve tal cual. */
export class AppError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
    this.name = 'AppError'
  }
}

type ErrorConCodigo = { code?: string; type?: string; name?: string; meta?: { target?: unknown } }

function prismaFriendlyMessage(err: ErrorConCodigo): { status: number; error: string } | null {
  if (err?.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : String(err.meta?.target ?? '')
    if (target.includes('email')) return { status: 409, error: 'Ya existe un usuario con ese email' }
    if (target.includes('document_number')) return { status: 409, error: 'Ya existe un paciente con ese documento' }
    if (target.includes('slug')) return { status: 409, error: 'Ese identificador de clínica ya está en uso' }
    if (target.includes('invoice_number')) return { status: 409, error: 'Ese número de comprobante ya existe' }
    return { status: 409, error: 'Ya existe un registro con esos datos' }
  }
  if (err?.code === 'P2025') return { status: 404, error: 'Registro no encontrado' }
  if (err?.code === 'P2003') return { status: 409, error: 'El registro está relacionado con otros datos' }
  if (err?.code === 'P2023') return { status: 400, error: 'Identificador inválido' }
  return null
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Datos inválidos',
      issues: err.issues,
    })
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message })
  }

  const e = (err ?? {}) as ErrorConCodigo
  const friendly = prismaFriendlyMessage(e)
  if (friendly) {
    console.warn('[prisma]', friendly.error)
    return res.status(friendly.status).json({ error: friendly.error })
  }

  // Errores del lector de JSON de Express (body-parser).
  if (e.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El archivo o los datos superan el tamaño máximo permitido' })
  }
  if (e.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Datos inválidos' })
  }

  // Cualquier otro error (Prisma, Stripe, almacenamiento, OCR…) trae mensajes
  // técnicos en inglés: se registran, pero el usuario recibe uno en español.
  console.error('[error]', err)
  return res.status(500).json({ error: 'Error interno del servidor. Inténtalo de nuevo en unos segundos.' })
}
