// Vista de los KPIs para la Consultora Senior: traduce el snapshot (mismos
// números que la página de Indicadores) a un resumen con semáforo, referencia,
// responsable y acción. SIN fórmulas: todo sale de kpis.service.ts.
import type { KpiEstado, KpiSnapshot } from '../kpis/kpis.types.js'
import { GUIA_KPIS, type GuiaKpi } from '../kpis/kpis.guia.js'

const SEMAFORO: Record<KpiEstado, string> = { bien: 'verde', atencion: 'ámbar', mal: 'rojo', sin_datos: 'sin datos' }
const r = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d

export function vistaConsultora(s: KpiSnapshot) {
  const e = s.esenciales
  const sc = s.scorecard
  return {
    periodo: s.periodo,
    desde: s.rango.inicio,
    hasta: s.rango.fin,
    moneda: s.moneda,
    esenciales: {
      capacidad_perdida: {
        ...GUIA_KPIS.capacidad,
        semaforo: SEMAFORO[e.capacidadPerdida.estado],
        perdida_pct: r(e.capacidadPerdida.perdidaPct),
        horas_disponibles: r(e.capacidadPerdida.horasDisponibles),
        horas_perdidas: r(e.capacidadPerdida.horasPerdidas),
        horas_huecos: r(e.capacidadPerdida.horasHuecos),
        horas_canceladas_no_show: r(e.capacidadPerdida.horasCanceladasNoShow),
        monto_perdido: e.capacidadPerdida.montoPerdido == null ? null : r(e.capacidadPerdida.montoPerdido, 0),
        nota: e.capacidadPerdida.horasDisponibles === 0
          ? 'Sin horarios de profesionales configurados (Configuración → Horarios)'
          : e.capacidadPerdida.horarioEstimado
            ? 'Algún profesional no tiene horario guardado: se estimó con el horario por defecto'
            : s.config.costoHoraConsulta == null ? 'Costo por hora de consulta sin configurar (Indicadores → Configurar)' : null,
      },
      no_show: { ...GUIA_KPIS.noShow, semaforo: SEMAFORO[e.noShow.estado], pct: r(e.noShow.pct), pct_periodo_anterior: r(e.noShow.pctAnterior), no_shows: e.noShow.noShows, citas_pasadas: e.noShow.citasPasadas },
      pacientes_sin_proxima_cita: {
        ...GUIA_KPIS.sinCita,
        semaforo: SEMAFORO[e.sinProximaCita.estado],
        total: e.sinProximaCita.total,
        atendidos_6m: e.sinProximaCita.atendidos,
        pct: r(e.sinProximaCita.pct),
        mas_recientes: e.sinProximaCita.pacientes.slice(0, 10).map((p) => ({ nombre: p.nombre, dias_desde_visita: p.diasDesdeVisita, profesional: p.profesional })),
      },
      tasa_cobro: {
        ...GUIA_KPIS.cobro,
        semaforo: SEMAFORO[e.cobro.estado],
        pct: r(e.cobro.tasaPct),
        facturado: r(e.cobro.facturado, 0),
        pendiente_total: r(e.cobro.pendienteTotal, 0),
        facturas_pendientes: e.cobro.facturasPendientes,
        dias_promedio_cobro: e.cobro.diasPromedioCobro == null ? null : r(e.cobro.diasPromedioCobro),
      },
    },
    balanced_scorecard: {
      financiera: { ingresos: r(sc.financiera.ingresos, 0), ingresos_periodo_anterior: r(sc.financiera.ingresosAnterior, 0), ingreso_por_consulta: r(sc.financiera.ingresoPorConsulta, 0) },
      paciente: { nuevos: sc.paciente.nuevos, nuevos_periodo_anterior: sc.paciente.nuevosAnterior, tasa_retorno_pct: r(sc.paciente.tasaRetornoPct), activos_6m: sc.paciente.activos6m },
      procesos: {
        consultas_realizadas: sc.procesos.consultasRealizadas,
        consultas_periodo_anterior: sc.procesos.consultasAnterior,
        ocupacion_pct: r(sc.procesos.ocupacionPct),
        ocupacion_semaforo: SEMAFORO[sc.procesos.ocupacionEstado],
        ocupacion_referencia: '70-85% verde, 60-70% ámbar, <60% rojo, >85% ámbar (sobrecarga)',
        cancelacion_pct: r(sc.procesos.cancelacionPct),
        citas_pasadas_sin_cerrar: sc.procesos.citasSinCerrar,
      },
      recursos: sc.recursos,
    },
    patient_journey: s.journey,
    productividad_por_profesional: s.productividad.map((p) => ({
      nombre: p.nombre, consultas: p.consultas, ingresos: r(p.ingresos, 0), ocupacion_pct: r(p.ocupacionPct), ingreso_por_hora: r(p.ingresoPorHora, 0),
    })),
    servicios_top: s.servicios.slice(0, 5),
    salud_financiera: s.saludFinanciera.configurado
      ? { costos_pct_sobre_ingresos: r(s.saludFinanciera.costosPct), semaforo: SEMAFORO[s.saludFinanciera.estado], referencia: 'costos operativos ≤65% verde, 65-70% ámbar, >70% rojo', costos_fijos: r(s.saludFinanciera.costosFijos, 0), consumo_insumos: r(s.saludFinanciera.consumoInsumos, 0) }
      : { configurado: false, nota: 'Costos fijos mensuales sin configurar (Indicadores → Configurar)' },
    dependencia_fundador: s.dependenciaFundador.aplica
      ? { fundador: s.dependenciaFundador.fundador, pct_ingresos: r(s.dependenciaFundador.fundadorPct), meta: '<40%', semaforo: SEMAFORO[s.dependenciaFundador.estado] }
      : { nota: 'Consultorio de un solo profesional: no aplica' },
  }
}

/** Alertas (ámbar/rojo) para el modo sin IA: mismas reglas y textos que la vista. */
export function alertasKpi(s: KpiSnapshot): string[] {
  const e = s.esenciales
  const items: [GuiaKpi, KpiEstado, string][] = [
    [GUIA_KPIS.capacidad, e.capacidadPerdida.estado, `${r(e.capacidadPerdida.perdidaPct)}% de la agenda disponible (${r(e.capacidadPerdida.horasPerdidas)} h)`],
    [GUIA_KPIS.noShow, e.noShow.estado, `${r(e.noShow.pct)}% (${e.noShow.noShows} de ${e.noShow.citasPasadas} citas)`],
    [GUIA_KPIS.sinCita, e.sinProximaCita.estado, `${e.sinProximaCita.total} paciente(s) (${r(e.sinProximaCita.pct)}% de los atendidos en 6 meses)`],
    [GUIA_KPIS.cobro, e.cobro.estado, `${r(e.cobro.tasaPct)}% cobrado; pendiente ${r(e.cobro.pendienteTotal, 0)} ${s.moneda}`],
  ]
  return items
    .filter(([, est]) => est === 'atencion' || est === 'mal')
    .map(([g, est, valor]) => `${est === 'mal' ? '🔴' : '🟠'} **${g.nombre}**: ${valor} — referencia ${g.referencia}. A quién: ${g.responsable}. Qué hacer: ${g.accion}`)
}
