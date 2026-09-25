// Entrada del generador RDA: plana y sin dependencias de Prisma, para que el
// generador sea puro y testeable. El mapper (mapper.ts) la construye desde la BD.
import type {
  ModalidadCo,
  OrigenIncapacidadCo,
  SexoCo,
  TipoCoberturaCo,
  TipoDiagnosticoCo,
  TipoDocumentoCo,
} from './fhir/perfiles.js'

export interface RdaPaciente {
  id: string
  tipoDocumento: TipoDocumentoCo
  numeroDocumento: string
  primerNombre: string
  segundoNombre?: string | null
  primerApellido: string
  segundoApellido?: string | null
  fechaNacimiento?: string | null // YYYY-MM-DD
  sexo?: SexoCo | null
  direccion?: string | null
  municipioDivipola?: string | null
  zonaResidencia?: 'U' | 'R' | null
  paisNacionalidad?: string | null
  telefono?: string | null
  email?: string | null
  ocupacionCiuo?: string | null
  ocupacionDescripcion?: string | null
}

export interface RdaPagador {
  tipoCobertura: TipoCoberturaCo
  epsCodigo?: string | null
  epsNombre?: string | null
  numeroAfiliacion?: string | null
}

export interface RdaProfesional {
  id: string
  tipoDocumento: TipoDocumentoCo
  numeroDocumento: string
  nombres: string
  apellidos: string
  especialidadCodigo?: string | null
  especialidadNombre?: string | null
  registroProfesional?: string | null
}

export interface RdaIps {
  id: string
  codigoHabilitacion: string
  nit: string
  digitoVerificacion?: string | null
  razonSocial: string
  municipioDivipola?: string | null
}

export interface RdaDiagnostico {
  codigo: string // CIE-10
  descripcion: string
  rol: 'principal' | 'relacionado'
  tipo?: TipoDiagnosticoCo
}

export interface RdaProcedimiento {
  cups: string
  descripcion: string
}

export interface RdaMedicamento {
  sistema?: 'ATC' | 'CUM' | null // null = solo texto (no codificado)
  codigo?: string | null
  nombre: string
  dosis?: string | null
  unidad?: string | null
  frecuencia?: string | null
  via?: string | null
  duracion?: string | null
  indicaciones?: string | null
}

export interface RdaAlergia {
  sustancia: string
  codigo?: string | null
  categoria?: 'food' | 'medication' | 'environment' | 'biologic' | null
  criticidad?: 'low' | 'high' | 'unable-to-assess' | null
}

export interface RdaFactorRiesgo {
  codigo?: string | null
  descripcion: string
}

export interface RdaIncapacidad {
  dias: number
  fechaInicio: string // YYYY-MM-DD
  origen: OrigenIncapacidadCo
}

export interface RdaConsulta {
  id: string // = medical_records.id
  fecha: string // ISO 8601 con zona
  fechaFin?: string | null
  estado: 'finished' | 'in-progress'
  modalidad: ModalidadCo
  finalidad?: string | null
  causaExterna?: string | null
  motivo?: string | null
}

export interface ConsultaRdaInput {
  consulta: RdaConsulta
  paciente: RdaPaciente
  pagador: RdaPagador
  profesional: RdaProfesional
  ips: RdaIps
  diagnosticos: RdaDiagnostico[]
  procedimientos: RdaProcedimiento[]
  medicamentos: RdaMedicamento[]
  alergias: RdaAlergia[]
  factoresRiesgo: RdaFactorRiesgo[]
  incapacidad?: RdaIncapacidad | null
}
