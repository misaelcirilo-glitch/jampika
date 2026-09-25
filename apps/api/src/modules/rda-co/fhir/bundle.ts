// Generador del Bundle "document" del RDA de consulta externa (FHIR R4, Minsalud CO).
// Puro: no toca BD ni red. La conexión a la API del Ministerio es un paso posterior.
import { randomUUID } from 'node:crypto'
import type { ConsultaRdaInput, RdaIncapacidad } from '../types.js'
import { CODIGO_RDA, EXTENSION, LOINC, ORIGENES_INCAPACIDAD, PERFIL, SISTEMA } from './perfiles.js'
import {
  crearCoverage,
  crearEncounter,
  crearOrganizacionEps,
  crearOrganization,
  crearPatient,
  crearPractitioner,
  ref,
} from './recursos.js'
import {
  crearAllergyIntolerance,
  crearCondition,
  crearFactorRiesgo,
  crearMedicationRequest,
  crearProcedure,
  type Contexto,
} from './recursos-clinicos.js'
import type { Bundle, BundleEntry, Composition, CompositionSection, Extension, RdaResource, Reference } from './types.js'

export interface OpcionesBundle {
  /** Generador de UUID (inyectable para tests deterministas). */
  newId?: () => string
  /** Reloj (inyectable para tests). */
  now?: () => Date
}

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const div = (lineas: string[]) =>
  `<div xmlns="http://www.w3.org/1999/xhtml">${lineas.map((l) => `<p>${escapar(l)}</p>`).join('')}</div>`

function seccion(title: string, code: { system: string; code: string; display: string }, entry: Reference[], lineas: string[]): CompositionSection {
  if (entry.length === 0 && lineas.length === 0) {
    return {
      title,
      code: { coding: [code] },
      emptyReason: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/list-empty-reason', code: 'nilknown', display: 'Nil Known' }] },
    }
  }
  return { title, code: { coding: [code] }, text: { status: 'generated', div: div(lineas) }, entry: entry.length ? entry : undefined }
}

function extensionIncapacidad(inc: RdaIncapacidad): Extension {
  return {
    url: EXTENSION.incapacidad,
    extension: [
      { url: 'dias', valueInteger: inc.dias },
      { url: 'fechaInicio', valueDate: inc.fechaInicio },
      { url: 'origen', valueCoding: { system: SISTEMA.origenIncapacidad, code: inc.origen, display: ORIGENES_INCAPACIDAD[inc.origen] } },
    ],
  }
}

type Bloques = Record<'dx' | 'proc' | 'med' | 'alg' | 'fr', { refs: Reference[]; lineas: string[] }>

function construirClinicos(input: ConsultaRdaInput, ctx: Contexto, newId: () => string, add: (r: RdaResource) => void): Bloques {
  const b: Bloques = { dx: { refs: [], lineas: [] }, proc: { refs: [], lineas: [] }, med: { refs: [], lineas: [] }, alg: { refs: [], lineas: [] }, fr: { refs: [], lineas: [] } }
  // Principal primero para que rank=1 coincida con el diagnóstico principal.
  const dxOrdenados = [...input.diagnosticos].sort((a, c) => (a.rol === c.rol ? 0 : a.rol === 'principal' ? -1 : 1))
  for (const d of dxOrdenados) {
    const r = crearCondition(newId(), d, ctx)
    add(r)
    b.dx.refs.push(ref(r.id!))
    b.dx.lineas.push(`${d.rol === 'principal' ? 'Principal' : 'Relacionado'}: ${d.codigo} ${d.descripcion}`)
  }
  for (const p of input.procedimientos) {
    const r = crearProcedure(newId(), p, ctx)
    add(r)
    b.proc.refs.push(ref(r.id!))
    b.proc.lineas.push(`CUPS ${p.cups} ${p.descripcion}`)
  }
  for (const m of input.medicamentos) {
    const r = crearMedicationRequest(newId(), m, ctx)
    add(r)
    b.med.refs.push(ref(r.id!))
    b.med.lineas.push([m.nombre, r.dosageInstruction?.[0]?.text].filter(Boolean).join(' — '))
  }
  for (const a of input.alergias) {
    const r = crearAllergyIntolerance(newId(), a, ctx)
    add(r)
    b.alg.refs.push(ref(r.id!))
    b.alg.lineas.push(a.sustancia)
  }
  for (const f of input.factoresRiesgo) {
    const r = crearFactorRiesgo(newId(), f, ctx)
    add(r)
    b.fr.refs.push(ref(r.id!))
    b.fr.lineas.push(f.descripcion)
  }
  return b
}

export function generarBundleRda(input: ConsultaRdaInput, opts: OpcionesBundle = {}): Bundle {
  const newId = opts.newId ?? randomUUID
  const now = (opts.now ?? (() => new Date()))().toISOString()
  const recursos: RdaResource[] = []

  const patient = crearPatient(input.paciente)
  const practitioner = crearPractitioner(input.profesional)
  const ips = crearOrganization(input.ips)
  const encounter = crearEncounter(input.consulta, input.paciente.id, input.profesional.id, input.ips.id)
  if (input.incapacidad) encounter.extension = [...(encounter.extension ?? []), extensionIncapacidad(input.incapacidad)]

  const epsOrg = input.pagador.tipoCobertura !== 'particular' && input.pagador.epsCodigo
    ? crearOrganizacionEps(newId(), input.pagador)
    : null
  const coverage = crearCoverage(newId(), input.pagador, input.paciente.id, epsOrg?.id)

  const ctx: Contexto = { pacienteId: input.paciente.id, encounterId: input.consulta.id, profesionalId: input.profesional.id, fecha: input.consulta.fecha }
  const clinicos: RdaResource[] = []
  const bloques = construirClinicos(input, ctx, newId, (r) => clinicos.push(r))
  encounter.diagnosis = bloques.dx.refs.map((condition, i) => ({
    condition,
    rank: i + 1,
    use: { coding: [{ system: SISTEMA.rolDiagnostico, code: i === 0 && input.diagnosticos.some((d) => d.rol === 'principal') ? 'principal' : 'relacionado' }] },
  }))

  recursos.push(patient, practitioner, ips, ...(epsOrg ? [epsOrg] : []), coverage, encounter, ...clinicos)

  const composition = crearComposition(newId(), input, now, bloques, coverage.id!)
  const entry: BundleEntry[] = [composition, ...recursos].map((r) => ({ fullUrl: `urn:uuid:${r.id!}`, resource: r }))

  return {
    resourceType: 'Bundle',
    id: newId(),
    meta: { profile: [PERFIL.bundle], lastUpdated: now },
    identifier: { system: SISTEMA.compositionId, value: input.consulta.id },
    type: 'document',
    timestamp: now,
    entry,
  }
}

function crearComposition(id: string, input: ConsultaRdaInput, now: string, b: Bloques, coverageId: string): Composition {
  const { consulta, pagador, incapacidad } = input
  const pagadorLinea = pagador.tipoCobertura === 'particular'
    ? 'Particular (pago directo)'
    : `${pagador.epsNombre ?? pagador.epsCodigo ?? 'EPS'} — ${pagador.tipoCobertura}${pagador.numeroAfiliacion ? ` (afiliación ${pagador.numeroAfiliacion})` : ''}`
  const loinc = (c: { code: string; display: string }) => ({ system: SISTEMA.loinc, ...c })
  const rda = (c: { code: string; display: string }) => ({ system: CODIGO_RDA.system, ...c })
  return {
    resourceType: 'Composition',
    id,
    meta: { profile: [PERFIL.composition] },
    identifier: { system: SISTEMA.compositionId, value: consulta.id },
    status: consulta.estado === 'finished' ? 'final' : 'preliminary',
    type: { coding: [loinc(LOINC.documento)], text: 'RDA — Consulta externa' },
    subject: ref(input.paciente.id),
    encounter: ref(consulta.id),
    date: now,
    author: [ref(input.profesional.id), ref(input.ips.id)],
    title: 'Registro Digital de Atención — Consulta externa',
    custodian: ref(input.ips.id),
    section: [
      seccion('Pagador', loinc(LOINC.seccionPagador), [ref(coverageId)], [pagadorLinea]),
      seccion('Diagnósticos', loinc(LOINC.seccionDiagnosticos), b.dx.refs, b.dx.lineas),
      seccion('Procedimientos', loinc(LOINC.seccionProcedimientos), b.proc.refs, b.proc.lineas),
      seccion('Medicamentos', loinc(LOINC.seccionMedicamentos), b.med.refs, b.med.lineas),
      seccion('Alergias', loinc(LOINC.seccionAlergias), b.alg.refs, b.alg.lineas),
      seccion('Factores de riesgo', rda(CODIGO_RDA.seccionFactoresRiesgo), b.fr.refs, b.fr.lineas),
      ...(incapacidad
        ? [seccion('Incapacidad', rda(CODIGO_RDA.seccionIncapacidad), [ref(consulta.id)], [
            `${incapacidad.dias} día(s) desde ${incapacidad.fechaInicio} — origen ${ORIGENES_INCAPACIDAD[incapacidad.origen]}`,
          ])]
        : []),
    ],
  }
}
