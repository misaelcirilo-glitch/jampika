// Contrato del snapshot de KPIs (GET /api/v1/kpis). La web tiene una copia de
// estos TIPOS en apps/web/src/features/kpis/types.ts — las fórmulas viven solo
// en kpis.service.ts / kpis.calc.ts.
import type { KpiPeriodo } from './kpis.time.js'

export type KpiEstado = 'bien' | 'atencion' | 'mal' | 'sin_datos'

export interface KpiPacienteSinCita {
  pacienteId: string
  nombre: string
  telefono: string | null
  ultimaVisita: string
  diasDesdeVisita: number
  profesional: string | null
}

export interface KpiProfesional {
  id: string
  nombre: string
  consultas: number
  ingresos: number
  horasDisponibles: number
  horasAtendidas: number
  ocupacionPct: number
  ingresoPorHora: number
}

export interface KpiSnapshot {
  clinica: string
  pais: string
  moneda: string
  periodo: KpiPeriodo
  rango: { inicio: string; fin: string; inicioAnterior: string; finAnterior: string }
  profesionalFiltro: string | null
  profesionales: { id: string; nombre: string }[]
  config: { costoHoraConsulta: number | null; costosFijosMensuales: number | null }
  esenciales: {
    capacidadPerdida: {
      horasDisponibles: number
      horasReservadas: number
      horasAtendidas: number
      horasHuecos: number
      horasCanceladasNoShow: number
      horasPerdidas: number
      perdidaPct: number
      montoPerdido: number | null
      horarioEstimado: boolean
      estado: KpiEstado
    }
    noShow: { citasPasadas: number; noShows: number; pct: number; pctAnterior: number; estado: KpiEstado }
    sinProximaCita: { total: number; atendidos: number; pct: number; pacientes: KpiPacienteSinCita[]; estado: KpiEstado }
    cobro: {
      facturado: number
      cobradoDeLoFacturado: number
      tasaPct: number
      pendienteTotal: number
      facturasPendientes: number
      diasPromedioCobro: number | null
      estado: KpiEstado
    }
  }
  scorecard: {
    financiera: { ingresos: number; ingresosAnterior: number; ingresoPorConsulta: number; ingresoPorConsultaAnterior: number }
    paciente: { nuevos: number; nuevosAnterior: number; tasaRetornoPct: number; activos6m: number }
    procesos: {
      citas: number
      consultasRealizadas: number
      consultasAnterior: number
      ocupacionPct: number
      ocupacionEstado: KpiEstado
      cancelacionPct: number
      citasSinCerrar: number
    }
    recursos: { insumosBajoStock: number; insumosPorVencer: number; valorInventario: number; consumoInsumos: number } | null
  }
  journey: { agendadas: number; asistidas: number; facturadas: number; cobradas: number; atendidosQueVolvieron: number; atendidos: number }
  productividad: KpiProfesional[]
  servicios: { servicio: string; unidades: number; ingresos: number }[]
  saludFinanciera: {
    configurado: boolean
    ingresos: number
    costosFijos: number
    consumoInsumos: number
    costosTotales: number
    costosPct: number
    estado: KpiEstado
  }
  dependenciaFundador: {
    aplica: boolean
    fundador: string | null
    ingresosFundador: number
    ingresosEquipo: number
    fundadorPct: number
    estado: KpiEstado
  }
}
