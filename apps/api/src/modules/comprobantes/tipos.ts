// Catálogos SUNAT (Perú) — códigos oficiales usados en comprobantes electrónicos.
// Independientes de la vía de emisión (proveedor OSE/PSE o SUNAT directo).

/** Catálogo 01 SUNAT — tipo de comprobante */
export const TIPO_COMPROBANTE = {
  FACTURA: '01',
  BOLETA: '03',
  NOTA_CREDITO: '07',
  NOTA_DEBITO: '08',
} as const
export type TipoComprobante = (typeof TIPO_COMPROBANTE)[keyof typeof TIPO_COMPROBANTE]

/** Catálogo 06 SUNAT — tipo de documento de identidad del receptor */
export const TIPO_DOC_IDENTIDAD = {
  SIN_DOC: '0', // consumidor final (solo boleta, monto < S/700)
  DNI: '1',
  CARNET_EXTRANJERIA: '4',
  RUC: '6',
  PASAPORTE: '7',
} as const
export type TipoDocIdentidad = (typeof TIPO_DOC_IDENTIDAD)[keyof typeof TIPO_DOC_IDENTIDAD]

/** Catálogo 07 SUNAT — tipo de afectación del IGV (por ítem) */
export const AFECTACION_IGV = {
  GRAVADO: '10', // Gravado - Operación onerosa (IGV 18%)
  EXONERADO: '20', // Exonerado - Operación onerosa
  INAFECTO: '30', // Inafecto - Operación onerosa
} as const
export type AfectacionIgv = (typeof AFECTACION_IGV)[keyof typeof AFECTACION_IGV]

/** Catálogo 02 SUNAT — moneda (subset usado) */
export const MONEDA = {
  PEN: 'PEN',
  USD: 'USD',
} as const

/** Tasa de IGV vigente en Perú */
export const IGV_RATE = 0.18

/** Mapea el `invoiceType` interno de Jampika al código de comprobante SUNAT. */
export function tipoComprobanteDesdeInvoiceType(invoiceType: string): TipoComprobante {
  switch (invoiceType) {
    case 'factura':
      return TIPO_COMPROBANTE.FACTURA
    case 'boleta':
      return TIPO_COMPROBANTE.BOLETA
    default:
      // nota_venta y otros: por defecto boleta (no es comprobante SUNAT formal)
      return TIPO_COMPROBANTE.BOLETA
  }
}

/** Prefijo de serie por tipo de comprobante: Factura = F, Boleta = B. */
export function prefijoSerie(tipo: TipoComprobante): 'F' | 'B' {
  return tipo === TIPO_COMPROBANTE.FACTURA ? 'F' : 'B'
}
