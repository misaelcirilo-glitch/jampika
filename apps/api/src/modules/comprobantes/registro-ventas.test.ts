import { describe, it, expect } from 'vitest'
import {
  construirRegistroVentas,
  registroVentasToCsv,
  type InvoiceParaRegistro,
} from './registro-ventas.js'

function invoiceBase(overrides: Partial<InvoiceParaRegistro> = {}): InvoiceParaRegistro {
  return {
    createdAt: new Date('2026-07-08T12:00:00.000Z'),
    invoiceType: 'boleta',
    serie: 'B001',
    correlativo: 1,
    receptorTipoDoc: '1',
    customerTaxId: '12345678',
    customerName: 'Juan Pérez',
    taxAmount: 0,
    discount: 0,
    total: 0,
    currency: 'PEN',
    items: [],
    ...overrides,
  }
}

describe('registro de ventas — desglose IGV por ítem', () => {
  it('separa gravado, exonerado e inafecto REALES (no todo como gravado)', () => {
    // Gravado 100 (IGV 18), exonerado 80, inafecto 50 → total 248
    const { filas, totales } = construirRegistroVentas([
      invoiceBase({
        taxAmount: 18,
        total: 248,
        items: [
          { subtotal: 100, afectacionIgv: 'gravado' },
          { subtotal: 80, afectacionIgv: 'exonerado' },
          { subtotal: 50, afectacionIgv: 'inafecto' },
        ],
      }),
    ])
    const f = filas[0]!
    expect(f.baseImponibleGravada).toBe(100)
    expect(f.importeExonerado).toBe(80)
    expect(f.importeInafecto).toBe(50)
    expect(f.igv).toBe(18)
    expect(f.importeTotal).toBe(248)
    expect(totales.baseImponibleGravada).toBe(100)
    expect(totales.importeExonerado).toBe(80)
    expect(totales.importeInafecto).toBe(50)
    expect(totales.igv).toBe(18)
    expect(totales.comprobantes).toBe(1)
  })

  it('el descuento reduce solo la base gravada, no el exonerado/inafecto', () => {
    // Gravado 100 - descuento 20 = base 80 (IGV 14.4); exonerado 50 intacto
    const { filas } = construirRegistroVentas([
      invoiceBase({
        discount: 20,
        taxAmount: 14.4,
        total: 144.4, // 80 + 14.4 + 50
        items: [
          { subtotal: 100, afectacionIgv: 'gravado' },
          { subtotal: 50, afectacionIgv: 'exonerado' },
        ],
      }),
    ])
    const f = filas[0]!
    expect(f.baseImponibleGravada).toBe(80)
    expect(f.importeExonerado).toBe(50)
    expect(f.importeInafecto).toBe(0)
    expect(f.igv).toBe(14.4)
  })

  it('comprobante 100% exonerado no reporta base gravada ni IGV', () => {
    const { filas, totales } = construirRegistroVentas([
      invoiceBase({
        invoiceType: 'boleta',
        taxAmount: 0,
        total: 200,
        items: [{ subtotal: 200, afectacionIgv: 'exonerado' }],
      }),
    ])
    expect(filas[0]!.baseImponibleGravada).toBe(0)
    expect(filas[0]!.importeExonerado).toBe(200)
    expect(filas[0]!.igv).toBe(0)
    expect(totales.importeExonerado).toBe(200)
  })

  it('mapea el tipo de comprobante SUNAT (01 factura / 03 boleta)', () => {
    const { filas } = construirRegistroVentas([
      invoiceBase({ invoiceType: 'factura', serie: 'F001', items: [{ subtotal: 100, afectacionIgv: 'gravado' }], taxAmount: 18, total: 118 }),
      invoiceBase({ invoiceType: 'boleta', serie: 'B001', items: [{ subtotal: 50, afectacionIgv: 'gravado' }], taxAmount: 9, total: 59 }),
    ])
    expect(filas[0]!.tipoComprobante).toBe('01')
    expect(filas[1]!.tipoComprobante).toBe('03')
  })

  it('el CSV incluye cabecera, filas y fila de TOTALES', () => {
    const registro = construirRegistroVentas([
      invoiceBase({ items: [{ subtotal: 100, afectacionIgv: 'gravado' }], taxAmount: 18, total: 118 }),
    ])
    const csv = registroVentasToCsv(registro)
    const lineas = csv.split('\r\n')
    expect(lineas[0]).toContain('Base Imponible Gravada')
    expect(lineas[0]).toContain('Importe Inafecto')
    expect(lineas[1]).toContain('B001')
    expect(lineas[lineas.length - 1]).toContain('TOTALES')
  })
})
