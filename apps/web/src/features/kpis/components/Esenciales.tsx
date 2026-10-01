'use client'

import { CalendarX, Clock, HandCoins, UserX } from 'lucide-react'
import type { GuiaKpis, KpiSnapshot } from '../types'
import { TarjetaEsencial } from './kpi-ui'

const h = (n: number) => `${n.toLocaleString('es', { maximumFractionDigits: 1 })} h`
const p = (n: number) => `${n.toLocaleString('es', { maximumFractionDigits: 1 })}%`

export function Esenciales(props: {
  s: KpiSnapshot
  guia: GuiaKpis
  dinero: (n: number) => string
  terminoPacientes: string
  onVerLista: () => void
  onConfigurar?: () => void
}) {
  const { s, guia, dinero, terminoPacientes, onVerLista, onConfigurar } = props
  const { capacidadPerdida: cap, noShow, sinProximaCita: sinCita, cobro } = s.esenciales

  const valorCapacidad = cap.horasDisponibles === 0 ? '—' : cap.montoPerdido != null ? dinero(cap.montoPerdido) : h(cap.horasPerdidas)
  const notaCapacidad =
    cap.horasDisponibles === 0
      ? 'Configura los horarios de los profesionales (Configuración → Horarios).'
      : cap.horarioEstimado
        ? 'Algún profesional no tiene horario guardado: se usó el horario por defecto.'
        : null

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <TarjetaEsencial
        icono={Clock}
        valor={valorCapacidad}
        subtitulo={cap.horasDisponibles > 0 ? `${h(cap.horasPerdidas)} de ${h(cap.horasDisponibles)} disponibles (${p(cap.perdidaPct)})` : undefined}
        estado={cap.estado}
        guia={guia.capacidad}
        extra={
          cap.horasDisponibles > 0 || notaCapacidad ? (
            <div className="space-y-0.5 text-[11px] text-muted-foreground">
              {cap.horasDisponibles > 0 && <p>Huecos sin reservar: {h(cap.horasHuecos)} · Cancelaciones y no-shows: {h(cap.horasCanceladasNoShow)}</p>}
              {notaCapacidad && <p className="italic">{notaCapacidad}</p>}
              {cap.horasDisponibles > 0 && cap.montoPerdido == null && onConfigurar && (
                <button type="button" onClick={onConfigurar} className="font-semibold text-primary underline-offset-2 hover:underline">
                  Configura el costo por hora para verlo en dinero
                </button>
              )}
            </div>
          ) : undefined
        }
      />
      <TarjetaEsencial
        icono={CalendarX}
        valor={noShow.citasPasadas > 0 ? p(noShow.pct) : '—'}
        subtitulo={`${noShow.noShows} de ${noShow.citasPasadas} citas · antes ${p(noShow.pctAnterior)}`}
        estado={noShow.estado}
        guia={guia.noShow}
      />
      <TarjetaEsencial
        icono={UserX}
        valor={String(sinCita.total)}
        subtitulo={`${terminoPacientes} atendidos en 6 meses sin cita futura (${p(sinCita.pct)} de ${sinCita.atendidos})`}
        estado={sinCita.estado}
        guia={guia.sinCita}
        accion={
          sinCita.total > 0 ? (
            <button type="button" onClick={onVerLista} className="self-start text-xs font-semibold text-primary underline-offset-2 hover:underline">
              Ver lista y contactar
            </button>
          ) : undefined
        }
      />
      <TarjetaEsencial
        icono={HandCoins}
        valor={cobro.facturado > 0 ? p(cobro.tasaPct) : '—'}
        subtitulo={`${dinero(cobro.cobradoDeLoFacturado)} cobrado de ${dinero(cobro.facturado)} facturado`}
        estado={cobro.estado}
        guia={guia.cobro}
        extra={
          <p className="text-[11px] text-muted-foreground">
            Pendiente total: {dinero(cobro.pendienteTotal)} ({cobro.facturasPendientes} facturas)
            {cobro.diasPromedioCobro != null && ` · cobro medio en ${cobro.diasPromedioCobro.toFixed(1)} días`}
          </p>
        }
      />
    </div>
  )
}
