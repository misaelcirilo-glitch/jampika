// Registro de Ventas SUNAT (PRP-010) — puente para el contador mientras no hay OSE/PSE.
// Lógica pura: transforma comprobantes emitidos en filas del Registro de Ventas
// (orden y códigos SUNAT) y genera el CSV que el contador carga en su sistema.
// No toca BD ni red; totalmente testeable.

import { IGV_RATE, TIPO_DOC_IDENTIDAD, tipoComprobanteDesdeInvoiceType } from './tipos.js'
import { inferirTipoDocReceptor } from './service.js'

/** Comprobante emitido tal como llega desde la BD (valores ya numéricos). */
export interface InvoiceParaRegistro {
  createdAt: Date
  invoiceType: string
  serie: string
  correlativo: number
  receptorTipoDoc: string | null
  customerTaxId: string | null
  customerName: string | null
  subtotal: number
  taxAmount: number
  discount: number
  total: number
  currency: string
}

/** Fila del Registro de Ventas en el orden típico SUNAT. */
export interface FilaRegistroVentas {
  fechaEmision: string // DD/MM/YYYY
  tipoComprobante: string // 01 factura / 03 boleta (catálogo 01)
  serie: string
  numero: string // correlativo a 8 dígitos
  tipoDocReceptor: string // catálogo 06 (0/1/6)
  numeroDocReceptor: string
  nombreReceptor: string
  baseImponibleGravada: number
  importeExonerado: number
  importeInafecto: number
  igv: number
  importeTotal: number
  moneda: string
  tipoCambio: string // solo para moneda extranjera (no se almacena aún)
}

/** Totales del periodo (suma de columnas de importe). */
export interface TotalesRegistroVentas {
  comprobantes: number
  baseImponibleGravada: number
  importeExonerado: number
  importeInafecto: number
  igv: number
  importeTotal: number
}

export interface RegistroVentas {
  filas: FilaRegistroVentas[]
  totales: TotalesRegistroVentas
}

const r2 = (n: number) => Number(n.toFixed(2))

/** Formatea una fecha (UTC) como DD/MM/YYYY para el Registro de Ventas. */
function fechaSunat(fecha: Date): string {
  const iso = fecha.toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Construye una fila del Registro de Ventas a partir de un comprobante emitido.
 * El desglose gravado/no gravado se deriva del IGV: como el modelo Invoice solo
 * persiste `subtotal` (gravado+exonerado+inafecto) e IGV total, la base gravada
 * neta = IGV / 0.18 y el resto se reporta como exonerado (no se distingue
 * exonerado de inafecto porque no se almacena por separado).
 */
export function construirFila(inv: InvoiceParaRegistro): FilaRegistroVentas {
  const tipoComprobante = tipoComprobanteDesdeInvoiceType(inv.invoiceType)
  const baseGravada = inv.taxAmount > 0 ? r2(inv.taxAmount / IGV_RATE) : 0
  const noGravado = Math.max(0, r2(inv.subtotal - baseGravada - inv.discount))
  const tipoDoc =
    inv.receptorTipoDoc ?? inferirTipoDocReceptor(tipoComprobante, inv.customerTaxId)
  return {
    fechaEmision: fechaSunat(inv.createdAt),
    tipoComprobante,
    serie: inv.serie,
    numero: String(inv.correlativo).padStart(8, '0'),
    tipoDocReceptor: tipoDoc,
    numeroDocReceptor: inv.customerTaxId ?? '',
    nombreReceptor: inv.customerName ?? (tipoDoc === TIPO_DOC_IDENTIDAD.SIN_DOC ? 'VARIOS - VENTAS MENORES' : ''),
    baseImponibleGravada: baseGravada,
    importeExonerado: noGravado,
    importeInafecto: 0,
    igv: r2(inv.taxAmount),
    importeTotal: r2(inv.total),
    moneda: inv.currency,
    // El tipo de cambio no se almacena aún; queda vacío (para PEN no aplica).
    tipoCambio: '',
  }
}

/** Genera las filas + totales del Registro de Ventas para un conjunto de comprobantes. */
export function construirRegistroVentas(invoices: InvoiceParaRegistro[]): RegistroVentas {
  const filas = invoices.map(construirFila)
  const totales = filas.reduce<TotalesRegistroVentas>(
    (acc, f) => ({
      comprobantes: acc.comprobantes + 1,
      baseImponibleGravada: r2(acc.baseImponibleGravada + f.baseImponibleGravada),
      importeExonerado: r2(acc.importeExonerado + f.importeExonerado),
      importeInafecto: r2(acc.importeInafecto + f.importeInafecto),
      igv: r2(acc.igv + f.igv),
      importeTotal: r2(acc.importeTotal + f.importeTotal),
    }),
    { comprobantes: 0, baseImponibleGravada: 0, importeExonerado: 0, importeInafecto: 0, igv: 0, importeTotal: 0 },
  )
  return { filas, totales }
}

/** Cabeceras del CSV (orden SUNAT), legibles para el contador. */
const CSV_HEADERS = [
  'Fecha Emisión',
  'Tipo Comprobante',
  'Serie',
  'Número',
  'Tipo Doc. Receptor',
  'Nro Doc. Receptor',
  'Nombre / Razón Social',
  'Base Imponible Gravada',
  'Importe Exonerado',
  'Importe Inafecto',
  'IGV',
  'Importe Total',
  'Moneda',
  'Tipo de Cambio',
] as const

/** Escapa un campo para CSV con separador `;` (comilla-envuelve si es necesario). */
function csvCampo(valor: string | number): string {
  const s = String(valor)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Serializa el Registro de Ventas a CSV (separador `;`, decimales con punto).
 * Incluye una fila final de TOTALES. Se antepone BOM al enviarse para que Excel
 * respete los acentos.
 */
export function registroVentasToCsv(registro: RegistroVentas): string {
  const lineas: string[] = [CSV_HEADERS.join(';')]
  for (const f of registro.filas) {
    lineas.push(
      [
        f.fechaEmision,
        f.tipoComprobante,
        f.serie,
        f.numero,
        f.tipoDocReceptor,
        f.numeroDocReceptor,
        f.nombreReceptor,
        f.baseImponibleGravada.toFixed(2),
        f.importeExonerado.toFixed(2),
        f.importeInafecto.toFixed(2),
        f.igv.toFixed(2),
        f.importeTotal.toFixed(2),
        f.moneda,
        f.tipoCambio,
      ]
        .map(csvCampo)
        .join(';'),
    )
  }
  const t = registro.totales
  lineas.push(
    ['', '', '', '', '', '', 'TOTALES', t.baseImponibleGravada.toFixed(2), t.importeExonerado.toFixed(2), t.importeInafecto.toFixed(2), t.igv.toFixed(2), t.importeTotal.toFixed(2), '', '']
      .map(csvCampo)
      .join(';'),
  )
  return lineas.join('\r\n')
}
