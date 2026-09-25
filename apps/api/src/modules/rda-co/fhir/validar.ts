// Validación básica del Bundle RDA (estructura, referencias y formato de códigos).
// NO sustituye al validador oficial FHIR del Ministerio: es una red de seguridad
// local para detectar datos faltantes antes de intentar el envío.
import { EXTENSION, FORMATO, SISTEMA, TIPOS_DOCUMENTO } from './perfiles.js'
import type { Bundle, Identifier, RdaResource } from './types.js'

export interface IssueRda {
  nivel: 'error' | 'advertencia'
  ruta: string
  mensaje: string
}

export interface ResultadoValidacion {
  valido: boolean
  errores: IssueRda[]
  advertencias: IssueRda[]
}

type Por<T extends RdaResource['resourceType']> = Extract<RdaResource, { resourceType: T }>

class Colector {
  issues: IssueRda[] = []
  error(ruta: string, mensaje: string) { this.issues.push({ nivel: 'error', ruta, mensaje }) }
  aviso(ruta: string, mensaje: string) { this.issues.push({ nivel: 'advertencia', ruta, mensaje }) }
  exigir(cond: unknown, ruta: string, mensaje: string) { if (!cond) this.error(ruta, mensaje) }
}

/** Recorre el recurso y devuelve todas las `reference` que contiene. */
function referencias(obj: unknown, out: string[] = []): string[] {
  if (Array.isArray(obj)) obj.forEach((o) => referencias(o, out))
  else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'reference' && typeof v === 'string') out.push(v)
      else referencias(v, out)
    }
  }
  return out
}

function validarEstructura(b: Bundle, c: Colector): Map<string, RdaResource> {
  c.exigir(b.resourceType === 'Bundle', 'Bundle.resourceType', 'Debe ser Bundle')
  c.exigir(b.type === 'document', 'Bundle.type', 'El RDA es un Bundle de tipo document')
  c.exigir(b.identifier?.value, 'Bundle.identifier', 'Bundle document requiere identifier (bdl-9)')
  c.exigir(FORMATO.fechaHora.test(b.timestamp ?? ''), 'Bundle.timestamp', 'timestamp ISO 8601 con zona obligatorio (bdl-10)')
  const porUrl = new Map<string, RdaResource>()
  if (!b.entry?.length) { c.error('Bundle.entry', 'Bundle vacío'); return porUrl }
  c.exigir(b.entry[0]?.resource.resourceType === 'Composition', 'Bundle.entry[0]', 'La primera entrada debe ser Composition (bdl-11)')
  b.entry.forEach((e, i) => {
    if (porUrl.has(e.fullUrl)) c.error(`Bundle.entry[${i}].fullUrl`, `fullUrl duplicado: ${e.fullUrl}`)
    if (e.resource.id && e.fullUrl !== `urn:uuid:${e.resource.id}`) c.error(`Bundle.entry[${i}].fullUrl`, 'fullUrl no coincide con resource.id')
    porUrl.set(e.fullUrl, e.resource)
  })
  b.entry.forEach((e, i) => {
    for (const r of referencias(e.resource)) {
      if (!porUrl.has(r)) c.error(`Bundle.entry[${i}] (${e.resource.resourceType})`, `Referencia sin resolver: ${r}`)
    }
  })
  return porUrl
}

function validarDocumentoPersona(id: Identifier | undefined, ruta: string, c: Colector) {
  const tipo = id?.type?.coding?.[0]?.code
  c.exigir(tipo && tipo in TIPOS_DOCUMENTO, `${ruta}.identifier.type`, `Tipo de documento inválido: ${tipo ?? '(vacío)'}`)
  c.exigir(id?.value?.trim(), `${ruta}.identifier.value`, 'Número de documento obligatorio')
}

function validarPatient(p: Por<'Patient'>, c: Colector) {
  validarDocumentoPersona(p.identifier[0], 'Patient', c)
  c.exigir(p.name[0]?.family?.trim(), 'Patient.name.family', 'Apellidos obligatorios')
  c.exigir(p.name[0]?.given?.length, 'Patient.name.given', 'Nombres obligatorios')
  c.exigir(p.birthDate && FORMATO.fecha.test(p.birthDate), 'Patient.birthDate', 'Fecha de nacimiento obligatoria (YYYY-MM-DD)')
  if (!p.extension?.some((e) => e.url === EXTENSION.sexoBiologico)) c.error('Patient.extension[sexoBiologico]', 'Sexo biológico (H/M/I) obligatorio')
  const ocup = p.extension?.find((e) => e.url === EXTENSION.ocupacion)?.valueCodeableConcept?.coding?.[0]?.code
  if (!ocup) c.aviso('Patient.extension[ocupacion]', 'Ocupación CIUO no informada')
  else c.exigir(FORMATO.ciuo.test(ocup), 'Patient.extension[ocupacion]', `Código CIUO inválido: ${ocup}`)
  if (!p.address?.length) c.aviso('Patient.address', 'Dirección / municipio DIVIPOLA no informados')
  if (!p.telecom?.length) c.aviso('Patient.telecom', 'Sin teléfono ni email')
}

function validarIps(o: Por<'Organization'>, c: Colector) {
  const reps = o.identifier.find((i) => i.system === SISTEMA.reps)?.value ?? ''
  const nit = o.identifier.find((i) => i.system === SISTEMA.nit)?.value ?? ''
  c.exigir(FORMATO.habilitacion.test(reps), 'Organization(IPS).identifier[REPS]', `Código de habilitación REPS inválido: ${reps || '(vacío)'}`)
  c.exigir(FORMATO.nit.test(nit.split('-')[0] ?? ''), 'Organization(IPS).identifier[NIT]', `NIT inválido: ${nit || '(vacío)'}`)
  c.exigir(o.name?.trim(), 'Organization(IPS).name', 'Razón social obligatoria')
}

function validarClinicos(recursos: RdaResource[], c: Colector) {
  const conds = recursos.filter((r): r is Por<'Condition'> => r.resourceType === 'Condition')
  if (conds.length === 0) c.error('Condition', 'Se requiere al menos un diagnóstico CIE-10')
  conds.forEach((d, i) => {
    const code = d.code.coding?.[0]?.code ?? ''
    c.exigir(FORMATO.cie10.test(code), `Condition[${i}].code`, `Código CIE-10 inválido: ${code || '(vacío)'}`)
  })
  recursos.filter((r): r is Por<'Procedure'> => r.resourceType === 'Procedure').forEach((p, i) => {
    const code = p.code.coding?.[0]?.code ?? ''
    c.exigir(FORMATO.cups.test(code), `Procedure[${i}].code`, `Código CUPS inválido: ${code || '(vacío)'}`)
  })
  recursos.filter((r): r is Por<'MedicationRequest'> => r.resourceType === 'MedicationRequest').forEach((m, i) => {
    const coding = m.medicationCodeableConcept.coding?.[0]
    const ruta = `MedicationRequest[${i}]`
    if (!coding?.code) c.aviso(`${ruta}.medication`, `"${m.medicationCodeableConcept.text}" sin código ATC/CUM (solo texto)`)
    else if (coding.system === SISTEMA.atc) c.exigir(FORMATO.atc.test(coding.code), `${ruta}.medication`, `Código ATC inválido: ${coding.code}`)
    else if (coding.system === SISTEMA.cum) c.exigir(FORMATO.cum.test(coding.code), `${ruta}.medication`, `Código CUM inválido: ${coding.code}`)
    const dosis = m.dosageInstruction?.[0]
    if (!dosis?.timing) c.aviso(`${ruta}.dosageInstruction.timing`, 'Frecuencia no informada')
    if (!dosis?.route) c.aviso(`${ruta}.dosageInstruction.route`, 'Vía de administración no informada')
  })
}

function validarEncounter(e: Por<'Encounter'>, c: Colector) {
  c.exigir(e.class?.code, 'Encounter.class', 'Clase de atención obligatoria')
  c.exigir(FORMATO.fechaHora.test(e.period?.start ?? ''), 'Encounter.period.start', 'Fecha/hora de la consulta obligatoria (ISO 8601 con zona)')
  const principales = (e.diagnosis ?? []).filter((d) => d.use?.coding?.[0]?.code === 'principal')
  c.exigir(principales.length === 1, 'Encounter.diagnosis', `Debe haber exactamente 1 diagnóstico principal (hay ${principales.length})`)
}

export function validarBundleRda(bundle: Bundle): ResultadoValidacion {
  const c = new Colector()
  const porUrl = validarEstructura(bundle, c)
  const recursos = [...porUrl.values()]
  const uno = <T extends RdaResource['resourceType']>(tipo: T): Por<T>[] =>
    recursos.filter((r): r is Por<T> => r.resourceType === tipo)

  const patients = uno('Patient')
  const encounters = uno('Encounter')
  c.exigir(patients.length === 1, 'Patient', `Debe haber exactamente 1 Patient (hay ${patients.length})`)
  c.exigir(encounters.length === 1, 'Encounter', `Debe haber exactamente 1 Encounter (hay ${encounters.length})`)
  c.exigir(uno('Coverage').length === 1, 'Coverage', 'Debe haber exactamente 1 Coverage (pagador)')
  if (patients[0]) validarPatient(patients[0], c)
  if (encounters[0]) validarEncounter(encounters[0], c)

  const practs = uno('Practitioner')
  c.exigir(practs.length >= 1, 'Practitioner', 'Falta el profesional')
  practs.forEach((p) => validarDocumentoPersona(p.identifier[0], 'Practitioner', c))
  if (practs[0] && !practs[0].qualification?.length) c.aviso('Practitioner.qualification', 'Especialidad no informada')

  const ips = uno('Organization').find((o) => o.identifier.some((i) => i.system === SISTEMA.reps))
  if (!ips) c.error('Organization(IPS)', 'Falta la IPS (Organization con código REPS)')
  else validarIps(ips, c)

  validarClinicos(recursos, c)

  const errores = c.issues.filter((i) => i.nivel === 'error')
  return { valido: errores.length === 0, errores, advertencias: c.issues.filter((i) => i.nivel === 'advertencia') }
}
