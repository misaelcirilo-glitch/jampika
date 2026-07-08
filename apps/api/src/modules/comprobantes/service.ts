// Orquestación de emisión de comprobantes (PRP-010, Fase 1).
// Reserva atómica de correlativo + cálculo + emisión (hoy simulada).

import type { Prisma, PrismaClient } from '@prisma/client'
import { prefijoSerie, TIPO_DOC_IDENTIDAD, type TipoComprobante, type TipoDocIdentidad } from './tipos.js'
import { formatearNumeroComprobante } from './numeracion.js'

type TxClient = Prisma.TransactionClient | PrismaClient

/**
 * Reserva el siguiente correlativo de la serie por defecto del tipo (F001/B001),
 * de forma atómica dentro de una transacción. Crea la serie si no existe.
 */
export async function reservarNumero(
  tx: TxClient,
  clinicId: string,
  tipoComprobante: TipoComprobante,
): Promise<{ serie: string; correlativo: number; numero: string }> {
  const serie = `${prefijoSerie(tipoComprobante)}001`
  const row = await tx.comprobanteSerie.upsert({
    where: { clinicId_serie: { clinicId, serie } },
    create: { clinicId, tipoComprobante, serie, correlativo: 1 },
    update: { correlativo: { increment: 1 } },
  })
  return { serie, correlativo: row.correlativo, numero: formatearNumeroComprobante(serie, row.correlativo) }
}

/**
 * Infiere el tipo de documento de identidad del receptor a partir del tipo de
 * comprobante y el número de documento (RUC 11, DNI 8, o consumidor final).
 */
export function inferirTipoDocReceptor(
  tipoComprobante: TipoComprobante,
  numeroDoc: string | null | undefined,
): TipoDocIdentidad {
  if (tipoComprobante === '01') return TIPO_DOC_IDENTIDAD.RUC // factura
  if (numeroDoc && /^\d{11}$/.test(numeroDoc)) return TIPO_DOC_IDENTIDAD.RUC
  if (numeroDoc && /^\d{8}$/.test(numeroDoc)) return TIPO_DOC_IDENTIDAD.DNI
  return TIPO_DOC_IDENTIDAD.SIN_DOC
}
