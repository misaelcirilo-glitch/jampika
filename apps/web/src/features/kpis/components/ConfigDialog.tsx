'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { guardarConfigKpis } from '../kpis.service'
import type { KpiSnapshot } from '../types'

const numeroOpcional = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : Number(v)))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0), 'Introduce un número igual o mayor que 0')

/** Ajustes de los KPIs (solo admin): se guardan en clinics.settings.kpis. */
export function ConfigDialog(props: {
  abierto: boolean
  onCerrar: () => void
  config: KpiSnapshot['config']
  moneda: string
  onGuardado: () => void
}) {
  const { abierto, onCerrar, config, moneda, onGuardado } = props
  const [costoHora, setCostoHora] = useState('')
  const [costosFijos, setCostosFijos] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setCostoHora(config.costoHoraConsulta?.toString() ?? '')
    setCostosFijos(config.costosFijosMensuales?.toString() ?? '')
    setError(null)
  }, [abierto, config])

  async function guardar() {
    const hora = numeroOpcional.safeParse(costoHora)
    const fijos = numeroOpcional.safeParse(costosFijos)
    if (!hora.success || !fijos.success) {
      setError((hora.error ?? fijos.error)?.issues[0]?.message ?? 'Valor no válido')
      return
    }
    setGuardando(true)
    try {
      await guardarConfigKpis({ costoHoraConsulta: hora.data, costosFijosMensuales: fijos.data })
      onGuardado()
      onCerrar()
    } catch {
      setError('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar indicadores</DialogTitle>
          <DialogDescription>Estos datos permiten expresar la capacidad perdida en dinero y analizar la salud financiera.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="kpi-costo-hora">Costo de una hora de consulta ({moneda})</Label>
            <Input id="kpi-costo-hora" type="number" min={0} inputMode="decimal" value={costoHora} onChange={(e) => setCostoHora(e.target.value)} placeholder="Ej. 80" />
            <p className="text-xs text-muted-foreground">Lo que deja de ingresar la clínica por cada hora de agenda sin atender.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kpi-costos-fijos">Costos fijos mensuales ({moneda})</Label>
            <Input id="kpi-costos-fijos" type="number" min={0} inputMode="decimal" value={costosFijos} onChange={(e) => setCostosFijos(e.target.value)} placeholder="Alquiler + personal fijo + servicios" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
