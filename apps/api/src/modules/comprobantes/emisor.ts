// Abstracción de emisión de comprobantes. TODA vía de emisión (proveedor OSE/PSE
// o SUNAT directo) implementa esta interfaz, de modo que el resto del sistema no
// depende de la decisión de integración (PRP-010).

import type { TipoComprobante, TipoDocIdentidad } from './tipos.js'
import type { ItemComprobanteCalculado, TotalesComprobante } from './numeracion.js'

/** Emisor (clínica) — datos de cabecera del comprobante. */
export interface EmisorDatos {
  ruc: string
  razonSocial: string
  direccion?: string
}

/** Receptor (paciente/cliente). */
export interface ReceptorDatos {
  tipoDoc: TipoDocIdentidad
  numeroDoc?: string
  nombre?: string
  direccion?: string
}

/** Comprobante listo para emitir (ya numerado y calculado). */
export interface ComprobanteParaEmitir {
  tipoComprobante: TipoComprobante
  serie: string
  correlativo: number
  numero: string // SERIE-CORRELATIVO
  fechaEmision: string // ISO
  moneda: string
  emisor: EmisorDatos
  receptor: ReceptorDatos
  items: ItemComprobanteCalculado[]
  totales: TotalesComprobante
}

export type EstadoEmision = 'aceptado' | 'rechazado' | 'observado' | 'pendiente'

export interface ResultadoEmision {
  estado: EstadoEmision
  hash?: string // hash del comprobante (código de barras / valor resumen)
  cdr?: string // Constancia de Recepción SUNAT (base64/xml) o equivalente del proveedor
  ticket?: string // ticket asíncrono (si aplica)
  xml?: string
  pdfUrl?: string
  mensaje?: string // motivo de rechazo/observación
}

export interface EmisorComprobante {
  readonly nombre: string
  emitir(comprobante: ComprobanteParaEmitir): Promise<ResultadoEmision>
}

/**
 * Emisor SIMULADO (Fase 1): no contacta a SUNAT. Acepta todo y genera un hash y
 * un CDR ficticios para poder construir y probar todo el flujo antes de conectar
 * un proveedor real o SUNAT directo. NUNCA usar en producción real.
 */
export class EmisorSimulado implements EmisorComprobante {
  readonly nombre = 'simulado'

  async emitir(comprobante: ComprobanteParaEmitir): Promise<ResultadoEmision> {
    // Hash determinista simple a partir del número + total (solo demostrativo).
    const semilla = `${comprobante.numero}|${comprobante.totales.importeTotal}|${comprobante.emisor.ruc}`
    const hash = simpleHash(semilla)
    return {
      estado: 'aceptado',
      hash,
      cdr: `SIMULADO-CDR:${comprobante.numero}`,
      mensaje: 'Comprobante aceptado (emisor simulado — no enviado a SUNAT)',
    }
  }
}

/**
 * Factory: devuelve el emisor según la configuración de la clínica.
 * En Fase 2 se añaden 'nubefact' | 'directo' aquí sin tocar el resto del código.
 */
export function getEmisor(proveedor: string): EmisorComprobante {
  switch (proveedor) {
    // case 'nubefact': return new EmisorNubefact(cred)   // Fase 2
    // case 'directo':  return new EmisorSunatDirecto(cert) // Fase 2
    case 'simulado':
    default:
      return new EmisorSimulado()
  }
}

function simpleHash(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
