import { describe, it, expect } from 'vitest'
import { AFECTACION_IGV, TIPO_COMPROBANTE, TIPO_DOC_IDENTIDAD, tipoComprobanteDesdeInvoiceType, prefijoSerie } from './tipos.js'
import { calcularTotales, formatearNumeroComprobante, serieValida, validarReceptor } from './numeracion.js'
import { EmisorSimulado, getEmisor } from './emisor.js'

describe('tipos SUNAT', () => {
  it('mapea invoiceType a código de comprobante', () => {
    expect(tipoComprobanteDesdeInvoiceType('factura')).toBe('01')
    expect(tipoComprobanteDesdeInvoiceType('boleta')).toBe('03')
  })
  it('prefijo de serie por tipo', () => {
    expect(prefijoSerie(TIPO_COMPROBANTE.FACTURA)).toBe('F')
    expect(prefijoSerie(TIPO_COMPROBANTE.BOLETA)).toBe('B')
  })
})

describe('numeración', () => {
  it('formatea SERIE-CORRELATIVO a 8 dígitos', () => {
    expect(formatearNumeroComprobante('B001', 1)).toBe('B001-00000001')
    expect(formatearNumeroComprobante('F001', 1234)).toBe('F001-00001234')
  })
  it('valida formato de serie', () => {
    expect(serieValida('F001', TIPO_COMPROBANTE.FACTURA)).toBe(true)
    expect(serieValida('B001', TIPO_COMPROBANTE.BOLETA)).toBe(true)
    expect(serieValida('X001', TIPO_COMPROBANTE.BOLETA)).toBe(false)
    expect(serieValida('B01', TIPO_COMPROBANTE.BOLETA)).toBe(false)
  })
})

describe('cálculo de IGV', () => {
  it('ítem gravado: IGV 18%', () => {
    const t = calcularTotales([{ descripcion: 'Consulta', cantidad: 1, valorUnitario: 100 }])
    expect(t.totalGravado).toBe(100)
    expect(t.totalIgv).toBe(18)
    expect(t.importeTotal).toBe(118)
  })
  it('ítem exonerado: sin IGV (servicio de salud)', () => {
    const t = calcularTotales([
      { descripcion: 'Servicio de salud', cantidad: 1, valorUnitario: 200, afectacion: AFECTACION_IGV.EXONERADO },
    ])
    expect(t.totalExonerado).toBe(200)
    expect(t.totalIgv).toBe(0)
    expect(t.importeTotal).toBe(200)
  })
  it('mixto gravado + exonerado', () => {
    const t = calcularTotales([
      { descripcion: 'Consulta', cantidad: 2, valorUnitario: 50 }, // 100 gravado
      { descripcion: 'Análisis', cantidad: 1, valorUnitario: 80, afectacion: AFECTACION_IGV.EXONERADO },
    ])
    expect(t.totalGravado).toBe(100)
    expect(t.totalExonerado).toBe(80)
    expect(t.totalIgv).toBe(18)
    expect(t.importeTotal).toBe(198)
  })
  it('descuento reduce base gravada', () => {
    const t = calcularTotales([{ descripcion: 'X', cantidad: 1, valorUnitario: 100 }], 20)
    expect(t.totalDescuento).toBe(20)
    expect(t.totalIgv).toBe(14.4) // (100-20)*0.18
    expect(t.importeTotal).toBe(94.4)
  })
})

describe('validación de receptor', () => {
  it('factura exige RUC 11 dígitos', () => {
    expect(validarReceptor(TIPO_COMPROBANTE.FACTURA, TIPO_DOC_IDENTIDAD.RUC, '20123456789', 500).ok).toBe(true)
    expect(validarReceptor(TIPO_COMPROBANTE.FACTURA, TIPO_DOC_IDENTIDAD.DNI, '12345678', 500).ok).toBe(false)
    expect(validarReceptor(TIPO_COMPROBANTE.FACTURA, TIPO_DOC_IDENTIDAD.RUC, '123', 500).ok).toBe(false)
  })
  it('boleta sin doc solo si < S/700', () => {
    expect(validarReceptor(TIPO_COMPROBANTE.BOLETA, TIPO_DOC_IDENTIDAD.SIN_DOC, undefined, 500).ok).toBe(true)
    expect(validarReceptor(TIPO_COMPROBANTE.BOLETA, TIPO_DOC_IDENTIDAD.SIN_DOC, undefined, 800).ok).toBe(false)
  })
  it('boleta con DNI válido', () => {
    expect(validarReceptor(TIPO_COMPROBANTE.BOLETA, TIPO_DOC_IDENTIDAD.DNI, '12345678', 800).ok).toBe(true)
    expect(validarReceptor(TIPO_COMPROBANTE.BOLETA, TIPO_DOC_IDENTIDAD.DNI, '123', 800).ok).toBe(false)
  })
})

describe('emisor simulado', () => {
  it('acepta y devuelve hash + cdr', async () => {
    const emisor = getEmisor('simulado')
    expect(emisor).toBeInstanceOf(EmisorSimulado)
    const res = await emisor.emitir({
      tipoComprobante: TIPO_COMPROBANTE.BOLETA,
      serie: 'B001',
      correlativo: 1,
      numero: 'B001-00000001',
      fechaEmision: '2026-07-08T00:00:00.000Z',
      moneda: 'PEN',
      emisor: { ruc: '20123456789', razonSocial: 'Clínica Demo' },
      receptor: { tipoDoc: TIPO_DOC_IDENTIDAD.DNI, numeroDoc: '12345678' },
      items: [],
      totales: { items: [], totalGravado: 100, totalExonerado: 0, totalInafecto: 0, totalIgv: 18, totalDescuento: 0, importeTotal: 118 },
    })
    expect(res.estado).toBe('aceptado')
    expect(res.hash).toBeTruthy()
    expect(res.cdr).toContain('B001-00000001')
  })
})
