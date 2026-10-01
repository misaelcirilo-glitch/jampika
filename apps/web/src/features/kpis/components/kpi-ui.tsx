'use client'

import { useState, type ComponentType, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, ChevronDown, Minus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { GuiaKpi, KpiEstado } from '../types'

type Icono = ComponentType<{ className?: string }>

export const ESTADO_UI: Record<KpiEstado, { texto: string; borde: string; chip: string; barra: string }> = {
  bien: { texto: 'En meta', borde: 'border-l-success', chip: 'bg-success/15 text-success', barra: 'bg-success' },
  atencion: { texto: 'Atención', borde: 'border-l-warning', chip: 'bg-warning/15 text-warning-foreground', barra: 'bg-warning' },
  mal: { texto: 'Crítico', borde: 'border-l-destructive', chip: 'bg-destructive/10 text-destructive', barra: 'bg-destructive' },
  sin_datos: { texto: 'Sin datos', borde: 'border-l-muted-foreground/30', chip: 'bg-muted text-muted-foreground', barra: 'bg-muted-foreground/40' },
}

export function EstadoChip({ estado }: { estado: KpiEstado }) {
  const ui = ESTADO_UI[estado]
  return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', ui.chip)}>{ui.texto}</span>
}

/** Variación % vs periodo anterior. `invertido`: bajar es bueno (no-show, cancelaciones). */
export function Tendencia({ actual, anterior, invertido = false }: { actual: number; anterior: number; invertido?: boolean }) {
  const delta = anterior === 0 ? (actual > 0 ? 100 : 0) : Math.round(((actual - anterior) / anterior) * 100)
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
        <Minus className="h-3 w-3" />0%
      </span>
    )
  }
  const bueno = invertido ? delta < 0 : delta > 0
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold', bueno ? 'bg-success/15 text-success' : 'bg-destructive/10 text-destructive')}>
      {delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(delta)}%
    </span>
  )
}

export function TarjetaEsencial(props: {
  icono: Icono
  valor: string
  subtitulo?: string
  estado: KpiEstado
  guia: GuiaKpi
  extra?: ReactNode
  accion?: ReactNode
}) {
  const { icono: I, valor, subtitulo, estado, guia, extra, accion } = props
  return (
    <Card className={cn('flex flex-col gap-3 border-l-4 p-5', ESTADO_UI[estado].borde)}>
      <div className="flex items-start justify-between">
        <div className="rounded-xl bg-secondary p-2.5 text-primary">
          <I className="h-5 w-5" />
        </div>
        <EstadoChip estado={estado} />
      </div>
      <div>
        <p className="text-3xl font-bold leading-tight text-foreground">{valor}</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{guia.nombre}</p>
        {subtitulo && <p className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</p>}
        <p className="mt-1 text-[11px] text-muted-foreground">Referencia: {guia.referencia}</p>
      </div>
      {extra}
      <div className="mt-auto space-y-1 border-t pt-3 text-xs text-muted-foreground">
        <p><span className="font-semibold text-foreground">A quién pedírselo:</span> {guia.responsable}</p>
        <p><span className="font-semibold text-foreground">Qué hacer si va mal:</span> {guia.accion}</p>
      </div>
      {accion}
    </Card>
  )
}

export function TarjetaDato(props: {
  icono: Icono
  etiqueta: string
  valor: string
  subtitulo?: string
  tendencia?: ReactNode
  estado?: KpiEstado
}) {
  const { icono: I, etiqueta, valor, subtitulo, tendencia, estado } = props
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="rounded-lg bg-secondary p-2 text-primary">
          <I className="h-4 w-4" />
        </div>
        {tendencia ?? (estado && <EstadoChip estado={estado} />)}
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground">{valor}</p>
      <p className="text-xs font-medium text-muted-foreground">{etiqueta}</p>
      {subtitulo && <p className="mt-0.5 text-[11px] text-muted-foreground/80">{subtitulo}</p>}
    </Card>
  )
}

/** Barra horizontal en CSS (sin librería de gráficos). */
export function BarraH({ etiqueta, valor, max, texto, color = 'bg-primary' }: { etiqueta: string; valor: number; max: number; texto: string; color?: string }) {
  const ancho = max > 0 ? Math.max((valor / max) * 100, valor > 0 ? 4 : 0) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-xs font-medium text-foreground sm:w-40" title={etiqueta}>{etiqueta}</span>
      <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
        <div className={cn('h-full rounded-md transition-all duration-500', color)} style={{ width: `${ancho}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right text-xs font-semibold text-foreground">{texto}</span>
    </div>
  )
}

export function SeccionDesplegable(props: {
  icono: Icono
  titulo: string
  subtitulo: string
  children: ReactNode
  id?: string
  abierta?: boolean
  onCambiar?: (abierta: boolean) => void
}) {
  const [abiertaLocal, setAbiertaLocal] = useState(false)
  const controlada = props.onCambiar !== undefined
  const abierta = controlada ? !!props.abierta : abiertaLocal
  const setAbierta = (fn: (v: boolean) => boolean) => (controlada ? props.onCambiar!(fn(abierta)) : setAbiertaLocal(fn))
  const I = props.icono
  return (
    <Card id={props.id} className="overflow-hidden">
      <button type="button" onClick={() => setAbierta((v) => !v)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/40">
        <div className="rounded-lg bg-secondary p-2 text-primary">
          <I className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">{props.titulo}</p>
          <p className="text-xs text-muted-foreground">{props.subtitulo}</p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', abierta && 'rotate-180')} />
      </button>
      {abierta && <div className="border-t p-4">{props.children}</div>}
    </Card>
  )
}
