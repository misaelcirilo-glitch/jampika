'use client'

import { useCallback, useEffect, useState } from 'react'
import { Gauge, RefreshCw, Settings2, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, cn } from '@/lib/utils'
import { getProfession, hasModule } from '@/lib/professions'
import { useAuthStore } from '@/stores/authStore'
import { obtenerKpis, type KpisRespuesta } from '@/features/kpis/kpis.service'
import type { KpiPeriodo } from '@/features/kpis/types'
import { Esenciales } from '@/features/kpis/components/Esenciales'
import { Scorecard } from '@/features/kpis/components/Scorecard'
import { ConfigDialog } from '@/features/kpis/components/ConfigDialog'
import {
  DependenciaSeccion,
  JourneySeccion,
  ProductividadSeccion,
  SaludFinancieraSeccion,
  ServiciosSeccion,
  SinCitaSeccion,
} from '@/features/kpis/components/Secciones'

const PERIODOS: { valor: KpiPeriodo; etiqueta: string }[] = [
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'trimestre', etiqueta: 'Trimestre' },
  { valor: 'anio', etiqueta: 'Año' },
]

// Indicadores de gestión. Los números llegan calculados de la API (/kpis), el
// mismo cálculo que usa la Consultora Senior: esta página solo los pinta.
export default function KpisPage() {
  const { user, clinic } = useAuthStore()
  const prof = getProfession(clinic?.professionType)
  const [periodo, setPeriodo] = useState<KpiPeriodo>('mes')
  const [profesionalId, setProfesionalId] = useState('todos')
  const [respuesta, setRespuesta] = useState<KpisRespuesta | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<'offline' | 'error' | null>(null)
  const [listaAbierta, setListaAbierta] = useState(false)
  const [configAbierta, setConfigAbierta] = useState(false)

  const sinAcceso = !!user && user.role !== 'admin' && user.role !== 'doctor'
  const esAdmin = user?.role === 'admin'

  const cargar = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('offline')
      setCargando(false)
      return
    }
    setCargando(true)
    setError(null)
    try {
      setRespuesta(await obtenerKpis(periodo, profesionalId))
    } catch {
      setError(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error')
    } finally {
      setCargando(false)
    }
  }, [periodo, profesionalId])

  useEffect(() => {
    if (!sinAcceso) cargar()
  }, [cargar, sinAcceso])

  if (sinAcceso) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Los indicadores de gestión están disponibles para administración y profesionales.</Card>
  }

  const s = respuesta?.data
  const dinero = (n: number) => formatCurrency(n, s?.moneda ?? 'PEN')

  function verLista() {
    setListaAbierta(true)
    setTimeout(() => document.getElementById('kpi-sin-cita')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Indicadores</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Los puntos que la Consultora Senior analiza para recomendarte acciones. Mismos números que ella cita.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {s && s.profesionales.length > 1 && (
            <select
              value={profesionalId}
              onChange={(e) => setProfesionalId(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
              aria-label="Filtrar por profesional"
            >
              <option value="todos">Todos los profesionales</option>
              {s.profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          )}
          <div className="flex rounded-md border bg-background p-0.5">
            {PERIODOS.map((p) => (
              <button
                key={p.valor}
                type="button"
                onClick={() => setPeriodo(p.valor)}
                className={cn('rounded px-3 py-1.5 text-xs font-semibold transition-colors', periodo === p.valor ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>
          {esAdmin && s && (
            <Button variant="outline" size="sm" onClick={() => setConfigAbierta(true)}>
              <Settings2 className="h-4 w-4" />Configurar
            </Button>
          )}
        </div>
      </div>

      {cargando && !s ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      ) : error || !s || !respuesta ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          {error === 'offline' && <WifiOff className="h-8 w-8 text-muted-foreground" />}
          <p className="text-sm font-semibold text-foreground">
            {error === 'offline' ? 'Los indicadores necesitan conexión a internet.' : 'No se pudieron cargar los indicadores.'}
          </p>
          <p className="text-xs text-muted-foreground">
            {error === 'offline' ? 'Tus datos siguen guardados en este equipo; los indicadores se calculan en el servidor.' : 'Inténtalo de nuevo en unos segundos.'}
          </p>
          <Button size="sm" variant="outline" onClick={cargar}><RefreshCw className="h-4 w-4" />Reintentar</Button>
        </Card>
      ) : (
        <div className={cn('space-y-8 transition-opacity', cargando && 'opacity-60')}>
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Los 4 números esenciales</h2>
              <p className="text-xs text-muted-foreground">Las fugas del ciclo de ingresos: capacidad, asistencia, seguimiento y cobro.</p>
            </div>
            <Esenciales s={s} guia={respuesta.guia} dinero={dinero} terminoPacientes={prof.patients}
              onVerLista={verLista} onConfigurar={esAdmin ? () => setConfigAbierta(true) : undefined} />
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Cuadro de mando</h2>
              <p className="text-xs text-muted-foreground">Las cuatro perspectivas del Balanced Scorecard, comparadas con el periodo anterior.</p>
            </div>
            <Scorecard s={s} dinero={dinero} terminoPacientes={prof.patients} conInventario={hasModule(clinic, 'inventario')} />
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">Análisis en detalle</h2>
            <JourneySeccion s={s} />
            <SinCitaSeccion s={s} abierta={listaAbierta} onCambiar={setListaAbierta} terminoPacientes={prof.patients} />
            <ProductividadSeccion s={s} dinero={dinero} />
            <ServiciosSeccion s={s} dinero={dinero} />
            <SaludFinancieraSeccion s={s} dinero={dinero} onConfigurar={esAdmin ? () => setConfigAbierta(true) : undefined} />
            <DependenciaSeccion s={s} dinero={dinero} />
          </section>
        </div>
      )}

      {s && esAdmin && (
        <ConfigDialog abierto={configAbierta} onCerrar={() => setConfigAbierta(false)} config={s.config} moneda={s.moneda} onGuardado={cargar} />
      )}
    </div>
  )
}
