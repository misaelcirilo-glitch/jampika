// Mapea los datos de Jampika (core + tablas rda_*_co) a la entrada del generador RDA.
// Puro: recibe filas ya cargadas. Prioriza los datos codificados de rda_*_co y cae
// a los campos del core (texto libre) cuando no existen; el validador marca lo que falte.
import { z } from 'zod'
import type { SexoCo, TipoDocumentoCo } from './fhir/perfiles.js'
import type { ConsultaRdaInput, RdaDiagnostico, RdaMedicamento, RdaPagador } from './types.js'

// ---------- Formas mínimas de las filas de entrada ----------
export interface FuentesRda {
  record: {
    id: string
    recordDate: Date
    isSigned: boolean
    subjective: string | null
    diagnoses: unknown
    prescriptions: unknown
  }
  patient: {
    id: string
    documentType: string
    documentNumber: string
    firstName: string
    lastName: string
    birthDate: Date | null
    gender: string | null
    phone: string | null
    email: string | null
    address: string | null
    insuranceProvider: string | null
    insuranceNumber: string | null
    allergies: string[]
    chronicConditions: string[]
  }
  doctor: { id: string; firstName: string; lastName: string; specialty: string | null; licenseNumber: string | null }
  clinic: { id: string; name: string; taxId: string | null }
  rdaPaciente?: {
    tipoDocumento: string
    numeroDocumento: string
    primerNombre: string | null
    segundoNombre: string | null
    primerApellido: string | null
    segundoApellido: string | null
    sexo: string | null
    paisNacionalidad: string | null
    municipioDivipola: string | null
    zonaResidencia: string | null
    ocupacionCiuo: string | null
    ocupacionDescripcion: string | null
    tipoCobertura: string
    epsCodigo: string | null
    epsNombre: string | null
    numeroAfiliacion: string | null
  } | null
  rdaProfesional?: {
    tipoDocumento: string
    numeroDocumento: string
    especialidadCodigo: string | null
    especialidadNombre: string | null
    registroProfesional: string | null
  } | null
  rdaIps?: { codigoHabilitacion: string; nit: string; digitoVerificacion: string | null; razonSocial: string; municipioDivipola: string | null } | null
  rdaConsulta?: {
    modalidad: string
    finalidad: string | null
    causaExterna: string | null
    tipoCobertura: string
    epsCodigo: string | null
    epsNombre: string | null
    numeroAfiliacion: string | null
    diagnosticos: unknown
    procedimientos: unknown
    medicamentos: unknown
    alergias: unknown
    factoresRiesgo: unknown
    incapacidad: unknown
  } | null
}

// ---------- Zod para los JSON (core y rda_consultas_co) ----------
const dxCore = z.array(z.object({ code: z.string(), description: z.string() }))
const rxCore = z.array(z.object({ medication: z.string(), dosage: z.string().optional(), frequency: z.string().optional(), duration: z.string().optional(), instructions: z.string().optional() }))
const dxRda = z.array(z.object({ codigo: z.string(), descripcion: z.string(), rol: z.enum(['principal', 'relacionado']), tipo: z.enum(['01', '02', '03']).optional() }))
const procRda = z.array(z.object({ cups: z.string(), descripcion: z.string() }))
const medRda = z.array(z.object({
  sistema: z.enum(['ATC', 'CUM']).nullish(),
  codigo: z.string().nullish(),
  nombre: z.string(),
  dosis: z.string().nullish(),
  unidad: z.string().nullish(),
  frecuencia: z.string().nullish(),
  via: z.string().nullish(),
  duracion: z.string().nullish(),
  indicaciones: z.string().nullish(),
}))
const algRda = z.array(z.object({
  sustancia: z.string(),
  codigo: z.string().nullish(),
  categoria: z.enum(['food', 'medication', 'environment', 'biologic']).nullish(),
  criticidad: z.enum(['low', 'high', 'unable-to-assess']).nullish(),
}))
const frRda = z.array(z.object({ codigo: z.string().nullish(), descripcion: z.string() }))
const incRda = z.object({ dias: z.number().int().positive(), fechaInicio: z.string(), origen: z.enum(['comun', 'laboral', 'transito']) })

const leer = <T>(schema: z.ZodType<T>, valor: unknown, porDefecto: T): T => {
  const r = schema.safeParse(valor)
  return r.success ? r.data : porDefecto
}

// ---------- Equivalencias core → catálogos Colombia ----------
const DOC_CORE_A_CO: Record<string, TipoDocumentoCo> = { CC: 'CC', CE: 'CE', TI: 'TI', PASAPORTE: 'PA', PA: 'PA', RC: 'RC' }
const GENDER_A_SEXO: Record<string, SexoCo> = { M: 'H', F: 'M', other: 'I' }

const partir = (s: string): [string, string | null] => {
  const [a = '', ...resto] = s.trim().split(/\s+/)
  return [a, resto.length ? resto.join(' ') : null]
}
const fechaISO = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)

function pagador(f: FuentesRda): RdaPagador {
  const fuente = f.rdaConsulta ?? f.rdaPaciente
  if (fuente) {
    return {
      tipoCobertura: fuente.tipoCobertura as RdaPagador['tipoCobertura'],
      epsCodigo: fuente.epsCodigo,
      epsNombre: fuente.epsNombre,
      numeroAfiliacion: fuente.numeroAfiliacion,
    }
  }
  if (f.patient.insuranceProvider) {
    return { tipoCobertura: 'otro', epsNombre: f.patient.insuranceProvider, numeroAfiliacion: f.patient.insuranceNumber }
  }
  return { tipoCobertura: 'particular' }
}

function diagnosticos(f: FuentesRda): RdaDiagnostico[] {
  const rda = leer(dxRda, f.rdaConsulta?.diagnosticos, [])
  if (rda.length) return rda
  // Core: CIE-10 sin rol → el primero es el principal.
  return leer(dxCore, f.record.diagnoses, []).map((d, i) => ({
    codigo: d.code.trim().toUpperCase(),
    descripcion: d.description,
    rol: i === 0 ? 'principal' : 'relacionado',
  }))
}

function medicamentos(f: FuentesRda): RdaMedicamento[] {
  const rda = leer(medRda, f.rdaConsulta?.medicamentos, [])
  if (rda.length) return rda
  return leer(rxCore, f.record.prescriptions, [])
    .filter((p) => p.medication.trim())
    .map((p) => ({ nombre: p.medication, dosis: p.dosage || null, frecuencia: p.frequency || null, duracion: p.duration || null, indicaciones: p.instructions || null }))
}

export function construirInputRda(f: FuentesRda): ConsultaRdaInput {
  const rp = f.rdaPaciente
  const [nom1, nom2] = partir(f.patient.firstName)
  const [ape1, ape2] = partir(f.patient.lastName)
  const alergiasRda = leer(algRda, f.rdaConsulta?.alergias, [])
  const factoresRda = leer(frRda, f.rdaConsulta?.factoresRiesgo, [])
  return {
    consulta: {
      id: f.record.id,
      fecha: f.record.recordDate.toISOString(),
      estado: f.record.isSigned ? 'finished' : 'in-progress',
      modalidad: (f.rdaConsulta?.modalidad as ConsultaRdaInput['consulta']['modalidad']) ?? 'intramural',
      finalidad: f.rdaConsulta?.finalidad,
      causaExterna: f.rdaConsulta?.causaExterna,
      motivo: f.record.subjective?.slice(0, 250) ?? null,
    },
    paciente: {
      id: f.patient.id,
      tipoDocumento: (rp?.tipoDocumento ?? DOC_CORE_A_CO[f.patient.documentType] ?? f.patient.documentType) as TipoDocumentoCo,
      numeroDocumento: rp?.numeroDocumento ?? f.patient.documentNumber,
      primerNombre: rp?.primerNombre ?? nom1,
      segundoNombre: rp ? rp.segundoNombre : nom2,
      primerApellido: rp?.primerApellido ?? ape1,
      segundoApellido: rp ? rp.segundoApellido : ape2,
      fechaNacimiento: fechaISO(f.patient.birthDate),
      sexo: (rp?.sexo as SexoCo | null) ?? (f.patient.gender ? GENDER_A_SEXO[f.patient.gender] ?? null : null),
      direccion: f.patient.address,
      municipioDivipola: rp?.municipioDivipola,
      zonaResidencia: rp?.zonaResidencia as 'U' | 'R' | null | undefined,
      paisNacionalidad: rp?.paisNacionalidad,
      telefono: f.patient.phone,
      email: f.patient.email,
      ocupacionCiuo: rp?.ocupacionCiuo,
      ocupacionDescripcion: rp?.ocupacionDescripcion,
    },
    pagador: pagador(f),
    profesional: {
      id: f.doctor.id,
      tipoDocumento: (f.rdaProfesional?.tipoDocumento ?? '') as TipoDocumentoCo,
      numeroDocumento: f.rdaProfesional?.numeroDocumento ?? '',
      nombres: f.doctor.firstName,
      apellidos: f.doctor.lastName,
      especialidadCodigo: f.rdaProfesional?.especialidadCodigo,
      especialidadNombre: f.rdaProfesional?.especialidadNombre ?? f.doctor.specialty,
      registroProfesional: f.rdaProfesional?.registroProfesional ?? f.doctor.licenseNumber,
    },
    ips: {
      id: f.clinic.id,
      codigoHabilitacion: f.rdaIps?.codigoHabilitacion ?? '',
      nit: f.rdaIps?.nit ?? f.clinic.taxId?.split('-')[0] ?? '',
      digitoVerificacion: f.rdaIps?.digitoVerificacion ?? f.clinic.taxId?.split('-')[1] ?? null,
      razonSocial: f.rdaIps?.razonSocial ?? f.clinic.name,
      municipioDivipola: f.rdaIps?.municipioDivipola,
    },
    diagnosticos: diagnosticos(f),
    procedimientos: leer(procRda, f.rdaConsulta?.procedimientos, []),
    medicamentos: medicamentos(f),
    alergias: alergiasRda.length ? alergiasRda : f.patient.allergies.filter(Boolean).map((sustancia) => ({ sustancia })),
    factoresRiesgo: factoresRda.length ? factoresRda : f.patient.chronicConditions.filter(Boolean).map((descripcion) => ({ descripcion })),
    incapacidad: leer(incRda.nullable(), f.rdaConsulta?.incapacidad ?? null, null),
  }
}
