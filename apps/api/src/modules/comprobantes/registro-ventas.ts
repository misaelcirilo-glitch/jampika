// Registro de Ventas SUNAT (PRP-010) — puente para el contador mientras no hay OSE/PSE.
// Lógica pura: transforma comprobantes emitidos en filas del Registro de Ventas
// (orden y códigos SUNAT) y genera el CSV que el contador carga en su sistema.
// No toca BD ni red; totalmente testeable.

import { TIPO_DOC_IDENTIDAD, tipoComprobanteDesdeInvoiceType } from './tipos.js'
import { inferirTipoDocReceptor } from './service.js'

/** Ítem de un comprobante con su afectación IGV (para el desglose real). */
export interface ItemParaRegistro {
  subtotal: number
  afectacionIgv: string // gravado | exonerado | inafecto
}

/** Comprobante emitido tal como llega desde la BD (valores ya numéricos). */
export interface InvoiceParaRegistro {
  createdAt: Date
  invoiceType: string
  serie: string
  correlativo: number
  receptorTipoDoc: string | null
  customerTaxId: string | null
  customerName: string | null
  taxAmount: number
  discount: number
  total: number
  currency: string
  items: ItemParaRegistro[]
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

/** Suma los subtotales de los ítems con la afectación indicada. */
function sumarPorAfectacion(items: ItemParaRegistro[], afectacion: string): number {
  return r2(items.filter((it) => it.afectacionIgv === afectacion).reduce((acc, it) => acc + it.subtotal, 0))
}

/**
 * Construye una fila del Registro de Ventas a partir de un comprobante emitido.
 * El desglose gravado/exonerado/inafecto se toma REAL de los ítems (campo
 * `afectacionIgv`). La base gravada reportada es neta del descuento (que en la
 * emisión reduce la base gravada, coherente con `taxAmount`). Los comprobantes
 * legacy sin afectación explícita quedan como `gravado` por el default de BD.
 */
export function construirFila(inv: InvoiceParaRegistro): FilaRegistroVentas {
  const tipoComprobante = tipoComprobanteDesdeInvoiceType(inv.invoiceType)
  const gravadoBruto = sumarPorAfectacion(inv.items, 'gravado')
  const exonerado = sumarPorAfectacion(inv.items, 'exonerado')
  const inafecto = sumarPorAfectacion(inv.items, 'inafecto')
  const baseGravada = Math.max(0, r2(gravadoBruto - inv.discount)) // el descuento reduce la base gravada
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
    importeExonerado: exonerado,
    importeInafecto: inafecto,
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
