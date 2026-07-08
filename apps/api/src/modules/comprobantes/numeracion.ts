// Numeración (serie + correlativo) y cálculo de importes según reglas SUNAT.
// Lógica pura y testeable; no toca BD ni red.

import {
  AFECTACION_IGV,
  IGV_RATE,
  TIPO_COMPROBANTE,
  TIPO_DOC_IDENTIDAD,
  type AfectacionIgv,
  type TipoComprobante,
  type TipoDocIdentidad,
} from './tipos.js'

/** Formatea el número oficial: SERIE-CORRELATIVO (correlativo a 8 dígitos). Ej: B001-00000001 */
export function formatearNumeroComprobante(serie: string, correlativo: number): string {
  return `${serie}-${String(correlativo).padStart(8, '0')}`
}

/** Valida el formato de serie: letra (F/B) + 3 dígitos. Ej: F001, B001 */
export function serieValida(serie: string, tipo: TipoComprobante): boolean {
  const prefijo = tipo === TIPO_COMPROBANTE.FACTURA ? 'F' : 'B'
  return new RegExp(`^${prefijo}\\d{3}$`).test(serie)
}

export interface ValidacionReceptor {
  ok: boolean
  error?: string
}

/**
 * Reglas de receptor SUNAT:
 * - Factura: exige RUC de 11 dígitos.
 * - Boleta: DNI de 8 dígitos, u otro doc, o consumidor final (sin doc) si monto < S/700.
 */
export function validarReceptor(
  tipo: TipoComprobante,
  tipoDoc: TipoDocIdentidad | undefined,
  numeroDoc: string | undefined,
  total: number,
): ValidacionReceptor {
  if (tipo === TIPO_COMPROBANTE.FACTURA) {
    if (tipoDoc !== TIPO_DOC_IDENTIDAD.RUC) return { ok: false, error: 'La factura requiere RUC del receptor' }
    if (!numeroDoc || !/^\d{11}$/.test(numeroDoc)) return { ok: false, error: 'RUC inválido (11 dígitos)' }
    return { ok: true }
  }
  // Boleta
  if (!tipoDoc || tipoDoc === TIPO_DOC_IDENTIDAD.SIN_DOC) {
    if (total >= 700) return { ok: false, error: 'Boleta ≥ S/700 requiere identificar al receptor (DNI)' }
    return { ok: true }
  }
  if (tipoDoc === TIPO_DOC_IDENTIDAD.DNI && (!numeroDoc || !/^\d{8}$/.test(numeroDoc))) {
    return { ok: false, error: 'DNI inválido (8 dígitos)' }
  }
  return { ok: true }
}

export interface ItemComprobanteInput {
  descripcion: string
  cantidad: number
  valorUnitario: number // sin IGV
  afectacion?: AfectacionIgv // por defecto GRAVADO
}

export interface ItemComprobanteCalculado extends ItemComprobanteInput {
  afectacion: AfectacionIgv
  valorVenta: number // cantidad * valorUnitario (sin IGV)
  igv: number
  precioUnitario: number // valorUnitario + IGV unitario (gravado) o = valorUnitario
}

export interface TotalesComprobante {
  items: ItemComprobanteCalculado[]
  totalGravado: number
  totalExonerado: number
  totalInafecto: number
  totalIgv: number
  totalDescuento: number
  importeTotal: number
}

const r2 = (n: number) => Number(n.toFixed(2))

/**
 * Calcula importes por ítem y totales según afectación IGV.
 * Solo los ítems gravados pagan IGV (18%); exonerados/inafectos no.
 * El descuento se aplica sobre la base gravada.
 */
export function calcularTotales(items: ItemComprobanteInput[], descuento = 0): TotalesComprobante {
  let totalGravado = 0
  let totalExonerado = 0
  let totalInafecto = 0

  const calculados: ItemComprobanteCalculado[] = items.map((it) => {
    const afectacion = it.afectacion ?? AFECTACION_IGV.GRAVADO
    const valorVenta = r2(it.cantidad * it.valorUnitario)
    let igv = 0
    let precioUnitario = it.valorUnitario
    if (afectacion === AFECTACION_IGV.GRAVADO) {
      igv = r2(valorVenta * IGV_RATE)
      precioUnitario = r2(it.valorUnitario * (1 + IGV_RATE))
      totalGravado += valorVenta
    } else if (afectacion === AFECTACION_IGV.EXONERADO) {
      totalExonerado += valorVenta
    } else {
      totalInafecto += valorVenta
    }
    return { ...it, afectacion, valorVenta, igv, precioUnitario }
  })

  const descuentoAplicado = Math.min(descuento, totalGravado)
  const baseGravada = r2(totalGravado - descuentoAplicado)
  const totalIgv = r2(baseGravada * IGV_RATE)
  const importeTotal = r2(baseGravada + totalIgv + totalExonerado + totalInafecto)

  return {
    items: calculados,
    totalGravado: r2(totalGravado),
    totalExonerado: r2(totalExonerado),
    totalInafecto: r2(totalInafecto),
    totalIgv,
    totalDescuento: r2(descuentoAplicado),
    importeTotal,
  }
}
