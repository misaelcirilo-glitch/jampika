// Fechas de KPIs en la zona horaria de la clínica (el servidor corre en UTC).
export type KpiPeriodo = 'semana' | 'mes' | 'trimestre' | 'anio'

export interface KpiRango {
  inicio: Date
  fin: Date
  inicioAnterior: Date
  finAnterior: Date
}

const DIA_MS = 86_400_000
const DIAS_SEMANA = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const CLAVES_DIA = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

interface PartesLocales {
  y: number
  m: number
  d: number
  dow: number
}

export function partesLocales(instante: Date, tz: string): PartesLocales {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(instante)
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? ''
  return { y: Number(get('year')), m: Number(get('month')) - 1, d: Number(get('day')), dow: DIAS_SEMANA.indexOf(get('weekday')) }
}

function desfaseMs(instante: Date, tz: string): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instante)
  const get = (t: string) => Number(partes.find((p) => p.type === t)?.value)
  const comoUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return comoUtc - Math.floor(instante.getTime() / 1000) * 1000
}

/** Medianoche local (y, m, d) en `tz`. Acepta desbordes (d - 6, m - 11…). */
export function medianocheLocal(y: number, m: number, d: number, tz: string): Date {
  const guess = Date.UTC(y, m, d)
  const primero = desfaseMs(new Date(guess), tz)
  return new Date(guess - desfaseMs(new Date(guess - primero), tz))
}

/** Hora local "HH:MM" del día (y, m, d) en `tz` como instante. */
export function horaLocal(y: number, m: number, d: number, hhmm: string, tz: string): Date {
  const [h, min] = hhmm.split(':').map(Number)
  const base = medianocheLocal(y, m, d, tz)
  return new Date(base.getTime() + ((h || 0) * 60 + (min || 0)) * 60_000)
}

export function rangoKpi(periodo: KpiPeriodo, tz: string, ahora = new Date()): KpiRango {
  const l = partesLocales(ahora, tz)
  const inicio =
    periodo === 'semana'
      ? medianocheLocal(l.y, l.m, l.d - ((l.dow + 6) % 7), tz)
      : periodo === 'trimestre'
        ? medianocheLocal(l.y, l.m - 2, 1, tz)
        : periodo === 'anio'
          ? medianocheLocal(l.y, 0, 1, tz)
          : medianocheLocal(l.y, l.m, 1, tz)
  const finAnterior = new Date(inicio.getTime() - 1)
  const p = partesLocales(finAnterior, tz)
  const inicioAnterior =
    periodo === 'semana'
      ? medianocheLocal(p.y, p.m, p.d - 6, tz)
      : periodo === 'trimestre'
        ? medianocheLocal(p.y, p.m - 2, 1, tz)
        : periodo === 'anio'
          ? medianocheLocal(p.y, 0, 1, tz)
          : medianocheLocal(p.y, p.m, 1, tz)
  return { inicio, fin: ahora, inicioAnterior, finAnterior }
}

/** Días locales (y, m, d, dow) que se solapan con [inicio, fin). */
export function diasDelRango(inicio: Date, fin: Date, tz: string): PartesLocales[] {
  const dias: PartesLocales[] = []
  const s = partesLocales(inicio, tz)
  for (let k = 0; k < 400; k++) {
    const inicioDia = medianocheLocal(s.y, s.m, s.d + k, tz)
    if (inicioDia.getTime() >= fin.getTime() && k > 0) break
    dias.push(partesLocales(new Date(inicioDia.getTime() + DIA_MS / 2), tz))
  }
  return dias
}

export function haceMeses(ahora: Date, meses: number, tz: string): Date {
  const l = partesLocales(ahora, tz)
  return medianocheLocal(l.y, l.m - meses, l.d, tz)
}

export const DIA = DIA_MS
