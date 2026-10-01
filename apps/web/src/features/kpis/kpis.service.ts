import { api } from '@/lib/api'
import type { GuiaKpis, KpiPeriodo, KpiSnapshot } from './types'

export interface KpisRespuesta {
  data: KpiSnapshot
  guia: GuiaKpis
}

export function obtenerKpis(periodo: KpiPeriodo, profesionalId: string) {
  const params = new URLSearchParams({ periodo })
  if (profesionalId !== 'todos') params.set('profesionalId', profesionalId)
  return api.get<KpisRespuesta>(`/kpis?${params.toString()}`)
}

export function guardarConfigKpis(config: { costoHoraConsulta: number | null; costosFijosMensuales: number | null }) {
  return api.put<{ data: { config: KpiSnapshot['config'] } }>('/kpis/config', config)
}

const PREFIJO_PAIS: Record<string, string> = { PE: '51', CO: '57', EC: '593', BO: '591', MX: '52', CL: '56' }

/** Teléfono para wa.me: solo dígitos y con prefijo del país si no lo trae. */
export function telefonoWhatsApp(telefono: string, pais: string): string {
  const digitos = telefono.replace(/\D/g, '')
  const prefijo = PREFIJO_PAIS[pais] ?? ''
  if (telefono.trim().startsWith('+') || !prefijo || digitos.startsWith(prefijo)) return digitos
  return `${prefijo}${digitos.replace(/^0+/, '')}`
}
