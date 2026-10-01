'use client'

import { Building2, Phone, PiggyBank, Route, Stethoscope, Tags, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { KpiSnapshot } from '../types'
import { telefonoWhatsApp } from '../kpis.service'
import { BarraH, ESTADO_UI, EstadoChip, SeccionDesplegable } from './kpi-ui'

const p = (n: number) => `${n.toLocaleString('es', { maximumFractionDigits: 1 })}%`
type Dinero = (n: number) => string

export function JourneySeccion({ s }: { s: KpiSnapshot }) {
  const j = s.journey
  const etapas = [
    { etiqueta: 'Agendadas', valor: j.agendadas, color: 'bg-primary/40' },
    { etiqueta: 'Asistidas', valor: j.asistidas, color: 'bg-primary/60' },
    { etiqueta: 'Facturadas', valor: j.facturadas, color: 'bg-primary/80' },
    { etiqueta: 'Cobradas', valor: j.cobradas, color: 'bg-primary' },
  ]
  const max = Math.max(...etapas.map((e) => e.valor), 1)
  return (
    <SeccionDesplegable icono={Route} titulo="Embudo del Patient Journey" subtitulo="Dónde se pierde cada cita: de agendada a cobrada, y si el paciente vuelve">
      <div className="space-y-2">
        {etapas.map((e, i) => (
          <BarraH key={e.etiqueta} etiqueta={e.etiqueta} valor={e.valor} max={max} color={e.color}
            texto={i === 0 ? String(e.valor) : `${e.valor} (${p(j.agendadas > 0 ? (e.valor / j.agendadas) * 100 : 0)})`} />
        ))}
      </div>
      <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs text-foreground">
        <span className="font-semibold">Fidelización:</span> {j.atendidosQueVolvieron} de {j.atendidos} pacientes atendidos en el periodo ya tienen otra cita.
      </p>
    </SeccionDesplegable>
  )
}

export function SinCitaSeccion(props: { s: KpiSnapshot; abierta: boolean; onCambiar: (v: boolean) => void; terminoPacientes: string }) {
  const { s, abierta, onCambiar, terminoPacientes } = props
  const lista = s.esenciales.sinProximaCita.pacientes
  return (
    <SeccionDesplegable id="kpi-sin-cita" icono={UserX} titulo={`${terminoPacientes} sin próxima cita`} subtitulo="Atendidos en los últimos 6 meses sin cita futura, del más reciente al más antiguo" abierta={abierta} onCambiar={onCambiar}>
      <p className="mb-3 rounded-lg bg-secondary px-3 py-2 text-xs text-foreground">
        Captar un paciente nuevo cuesta publicidad y tiempo; recuperar a uno que ya te conoce cuesta una llamada. Empieza por los más recientes.
      </p>
      {lista.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Todos los atendidos tienen próxima cita.</p>
      ) : (
        <div className="divide-y">
          {lista.map((pac) => (
            <div key={pac.pacienteId} className="flex flex-wrap items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{pac.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  Última visita hace {pac.diasDesdeVisita} días{pac.profesional ? ` · ${pac.profesional}` : ''}
                </p>
              </div>
              {pac.telefono ? (
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={`tel:${pac.telefono}`}><Phone className="h-3.5 w-3.5" />Llamar</a>
                  </Button>
                  <Button asChild size="sm">
                    <a href={`https://wa.me/${telefonoWhatsApp(pac.telefono, s.pais)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Sin teléfono</span>
              )}
            </div>
          ))}
        </div>
      )}
    </SeccionDesplegable>
  )
}

export function ProductividadSeccion({ s, dinero }: { s: KpiSnapshot; dinero: Dinero }) {
  const max = Math.max(...s.productividad.map((pr) => pr.ingresos), 1)
  return (
    <SeccionDesplegable icono={Stethoscope} titulo="Productividad por profesional" subtitulo="Consultas, ingresos, ocupación e ingreso por hora atendida">
      {s.productividad.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin actividad en el periodo.</p>
      ) : (
        <div className="space-y-4">
          {s.productividad.map((pr) => (
            <div key={pr.id} className="space-y-1">
              <BarraH etiqueta={pr.nombre} valor={pr.ingresos} max={max} texto={dinero(pr.ingresos)} />
              <p className="pl-0 text-[11px] text-muted-foreground sm:pl-40">
                {pr.consultas} consultas · ocupación {pr.horasDisponibles > 0 ? p(pr.ocupacionPct) : '—'} · {dinero(pr.ingresoPorHora)}/hora atendida
              </p>
            </div>
          ))}
        </div>
      )}
    </SeccionDesplegable>
  )
}

export function ServiciosSeccion({ s, dinero }: { s: KpiSnapshot; dinero: Dinero }) {
  const max = Math.max(...s.servicios.map((sv) => sv.ingresos), 1)
  return (
    <SeccionDesplegable icono={Tags} titulo="Ingresos por servicio" subtitulo="Qué servicios sostienen la clínica (facturas cobradas en el periodo)">
      {s.servicios.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin cobros en el periodo.</p>
      ) : (
        <div className="space-y-2">
          {s.servicios.map((sv) => (
            <BarraH key={sv.servicio} etiqueta={sv.servicio} valor={sv.ingresos} max={max} texto={`${dinero(sv.ingresos)} · ${sv.unidades} ud.`} />
          ))}
        </div>
      )}
    </SeccionDesplegable>
  )
}

export function SaludFinancieraSeccion({ s, dinero, onConfigurar }: { s: KpiSnapshot; dinero: Dinero; onConfigurar?: () => void }) {
  const sf = s.saludFinanciera
  return (
    <SeccionDesplegable icono={PiggyBank} titulo="Salud financiera" subtitulo="Costos operativos sobre ingresos. Referencia: no superar el 65-70%">
      {!sf.configurado ? (
        <div className="py-6 text-center">
          <p className="text-sm font-semibold text-foreground">Configura tus costos fijos mensuales para ver este análisis</p>
          <p className="mt-1 text-xs text-muted-foreground">Alquiler, personal fijo, servicios, seguros…</p>
          {onConfigurar && <Button size="sm" className="mt-3" onClick={onConfigurar}>Configurar costos</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-foreground">{p(sf.costosPct)}</p>
            <EstadoChip estado={sf.estado} />
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className={`h-full ${ESTADO_UI[sf.estado].barra}`} style={{ width: `${Math.min(sf.costosPct, 100)}%` }} />
          </div>
          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
            <p>Ingresos: <span className="font-semibold text-foreground">{dinero(sf.ingresos)}</span></p>
            <p>Costos fijos (prorrateados): <span className="font-semibold text-foreground">{dinero(sf.costosFijos)}</span></p>
            <p>Consumo de insumos: <span className="font-semibold text-foreground">{dinero(sf.consumoInsumos)}</span></p>
          </div>
        </div>
      )}
    </SeccionDesplegable>
  )
}

export function DependenciaSeccion({ s, dinero }: { s: KpiSnapshot; dinero: Dinero }) {
  const d = s.dependenciaFundador
  return (
    <SeccionDesplegable icono={Building2} titulo="Dependencia del fundador" subtitulo="Qué parte de los ingresos depende del titular. Meta: menos del 40%">
      {!d.aplica ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Consultorio de un solo profesional: este indicador no aplica.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-foreground">{p(d.fundadorPct)}</p>
            <EstadoChip estado={d.estado} />
          </div>
          <div className="flex h-7 overflow-hidden rounded-lg bg-muted text-[11px] font-semibold">
            <div className="flex items-center justify-center bg-primary text-primary-foreground" style={{ width: `${d.fundadorPct}%` }}>{d.fundadorPct > 12 && p(d.fundadorPct)}</div>
            <div className="flex flex-1 items-center justify-center text-foreground">{100 - d.fundadorPct > 12 && p(100 - d.fundadorPct)}</div>
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>{d.fundador ?? 'Titular'}: <span className="font-semibold text-foreground">{dinero(d.ingresosFundador)}</span></span>
            <span>Resto del equipo: <span className="font-semibold text-foreground">{dinero(d.ingresosEquipo)}</span></span>
          </div>
        </div>
      )}
    </SeccionDesplegable>
  )
}
