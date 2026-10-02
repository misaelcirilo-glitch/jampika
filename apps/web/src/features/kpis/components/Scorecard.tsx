'use client'

import { Activity, AlertTriangle, Ban, CalendarCheck, Coins, Package, Receipt, Repeat, UserPlus } from 'lucide-react'
import type { KpiSnapshot } from '../types'
import { TarjetaDato, Tendencia } from './kpi-ui'

const p = (n: number) => `${n.toLocaleString('es', { maximumFractionDigits: 1 })}%`

function Perspectiva({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  )
}

/** Nivel 2 — Cuadro de mando integral: las 4 perspectivas que usa la consultora. */
export function Scorecard(props: { s: KpiSnapshot; dinero: (n: number) => string; terminoPacientes: string; conInventario: boolean }) {
  const { s, dinero, terminoPacientes, conInventario } = props
  const { financiera: f, paciente: pa, procesos: pr } = s.scorecard
  const r = conInventario ? s.scorecard.recursos : null
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Perspectiva titulo="Financiera">
        <TarjetaDato icono={Coins} etiqueta="Ingresos cobrados" valor={dinero(f.ingresos)} subtitulo={`Antes: ${dinero(f.ingresosAnterior)}`} tendencia={<Tendencia actual={f.ingresos} anterior={f.ingresosAnterior} />} />
        <TarjetaDato icono={Receipt} etiqueta="Ingreso por consulta" valor={dinero(f.ingresoPorConsulta)} subtitulo={`Antes: ${dinero(f.ingresoPorConsultaAnterior)}`} tendencia={<Tendencia actual={f.ingresoPorConsulta} anterior={f.ingresoPorConsultaAnterior} />} />
      </Perspectiva>
      <Perspectiva titulo={terminoPacientes}>
        <TarjetaDato icono={UserPlus} etiqueta="Nuevos" valor={String(pa.nuevos)} subtitulo={`Antes: ${pa.nuevosAnterior}`} tendencia={<Tendencia actual={pa.nuevos} anterior={pa.nuevosAnterior} />} />
        <TarjetaDato icono={Repeat} etiqueta="Tasa de retorno (6 meses)" valor={p(pa.tasaRetornoPct)} subtitulo={`Con 2 o más visitas, sobre ${pa.activos6m} atendidos`} />
      </Perspectiva>
      <Perspectiva titulo="Procesos">
        <TarjetaDato icono={Activity} etiqueta="Ocupación de agenda" valor={s.esenciales.capacidadPerdida.horasDisponibles > 0 ? p(pr.ocupacionPct) : '—'} subtitulo="Meta 70-85% (más de 85% = sobrecarga)" estado={pr.ocupacionEstado} />
        <TarjetaDato icono={CalendarCheck} etiqueta="Consultas realizadas" valor={String(pr.consultasRealizadas)} subtitulo={`De ${pr.citas} citas · antes ${pr.consultasAnterior}`} tendencia={<Tendencia actual={pr.consultasRealizadas} anterior={pr.consultasAnterior} />} />
        <TarjetaDato icono={Ban} etiqueta="Cancelaciones" valor={p(pr.cancelacionPct)} />
        <TarjetaDato icono={AlertTriangle} etiqueta="Citas pasadas sin cerrar" valor={String(pr.citasSinCerrar)} subtitulo="Márcalas como atendida o como inasistencia para que los datos sean fiables" estado={pr.citasSinCerrar > 0 ? 'atencion' : 'bien'} />
      </Perspectiva>
      {r && (
        <Perspectiva titulo="Recursos">
          <TarjetaDato icono={Package} etiqueta="Insumos bajo stock mínimo" valor={String(r.insumosBajoStock)} subtitulo={`${r.insumosPorVencer} por vencer en 30 días`} estado={r.insumosBajoStock > 0 || r.insumosPorVencer > 0 ? 'atencion' : 'bien'} />
          <TarjetaDato icono={Coins} etiqueta="Consumo de insumos" valor={dinero(r.consumoInsumos)} subtitulo={`Valor del inventario: ${dinero(r.valorInventario)}`} />
        </Perspectiva>
      )}
    </div>
  )
}
