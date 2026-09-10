import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database.js'

// Gate de módulos/add-ons por clínica: 403 si la clínica no tiene el módulo en
// settings.enabledModules. Los add-ons ('chat', etc.) NO están por defecto → se
// añaden al contratar. Usar tras authMiddleware.
export function requireModule(moduleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clinic = await prisma.clinic.findUnique({
        where: { id: req.auth!.clinicId },
        select: { settings: true },
      })
      const s = (clinic?.settings ?? {}) as Record<string, unknown>
      const mods = Array.isArray(s.enabledModules) ? (s.enabledModules as unknown[]) : []
      if (!mods.includes(moduleName)) {
        return res.status(403).json({ error: 'Módulo no disponible en tu plan' })
      }
      next()
    } catch (e) {
      next(e)
    }
  }
}
