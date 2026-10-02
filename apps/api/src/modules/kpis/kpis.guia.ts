// Una sola definición de referencia / "a quién pedírselo" / "qué hacer" por KPI
// esencial. La API la envía a la página de Indicadores y la usa la consultora.
export interface GuiaKpi {
  nombre: string
  referencia: string
  responsable: string
  accion: string
}

export const GUIA_KPIS: Record<'capacidad' | 'noShow' | 'sinCita' | 'cobro', GuiaKpi> = {
  capacidad: {
    nombre: 'Capacidad perdida',
    referencia: '<10% verde, 10-20% ámbar, >20% rojo',
    responsable: 'Recepción',
    accion: 'Llenar huecos con lista de espera y reprogramar en el momento cada cancelación: nadie cuelga sin nueva fecha.',
  },
  noShow: {
    nombre: 'Inasistencias',
    referencia: '<5% verde, 5-10% ámbar, >10% rojo',
    responsable: 'Recepción',
    accion: 'Confirmación por WhatsApp 24h antes y lista de espera para cubrir las ausencias.',
  },
  sinCita: {
    nombre: 'Pacientes sin próxima cita',
    referencia: '<40% de los atendidos verde, 40-60% ámbar, >60% rojo',
    responsable: 'Recepción',
    accion: 'Al terminar la consulta se agenda el control antes de que el paciente salga; 1 hora a la semana llamando a los pendientes.',
  },
  cobro: {
    nombre: 'Tasa de cobro',
    referencia: '>95% verde, 90-95% ámbar, <90% rojo',
    responsable: 'Administración',
    accion: 'Cobrar en el momento de la atención y revisar cada semana las facturas pendientes.',
  },
}
