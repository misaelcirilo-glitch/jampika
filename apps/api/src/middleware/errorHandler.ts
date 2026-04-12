import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

function prismaFriendlyMessage(err: any): string | null {
  if (err?.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : String(err.meta?.target ?? '')
    if (target.includes('email')) return 'Ya existe un usuario con ese email'
    if (target.includes('document_number')) return 'Ya existe un paciente con ese documento'
    if (target.includes('slug')) return 'Ese identificador de clínica ya está en uso'
    if (target.includes('invoice_number')) return 'Ese número de comprobante ya existe'
    return `Valor duplicado: ${target}`
  }
  if (err?.code === 'P2025') return 'Registro no encontrado'
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

  const friendly = prismaFriendlyMessage(err)
  if (friendly) {
    console.warn('[prisma]', friendly)
    return res.status(409).json({ error: friendly })
  }

  if (err instanceof Error) {
    console.error('[error]', err)
    return res.status(500).json({ error: err.message })
  }
  console.error('[error desconocido]', err)
  return res.status(500).json({ error: 'Error interno del servidor' })
}
