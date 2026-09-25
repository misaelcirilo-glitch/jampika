// Canonicals de la guía RDA (Minsalud CO, STU1 borrador) + sistemas de codificación.
// ÚNICO sitio a tocar si el Ministerio publica cambios en los perfiles:
// verificar cada URL contra la versión vigente del IG antes de conectar la API real.

export const RDA_IG_VERSION = 'STU1-draft'
export const RDA_BASE = 'https://fhir.minsalud.gov.co/rda'

const sd = (name: string) => `${RDA_BASE}/StructureDefinition/${name}`
const cs = (name: string) => `${RDA_BASE}/CodeSystem/${name}`

export const PERFIL = {
  bundle: sd('BundleRDA'),
  composition: sd('CompositionRDA'),
  patient: sd('PatientRDA'),
  practitioner: sd('PractitionerRDA'),
  organization: sd('OrganizationRDA'),
  coverage: sd('CoverageRDA'),
  encounter: sd('EncounterRDA'),
  condition: sd('ConditionRDA'),
  procedure: sd('ProcedureRDA'),
  medicationRequest: sd('MedicationRequestRDA'),
  allergyIntolerance: sd('AllergyIntoleranceRDA'),
  observation: sd('ObservationRDA'),
} as const

export const EXTENSION = {
  sexoBiologico: sd('ExtensionBiologicalSex'),
  segundoApellido: sd('ExtensionSecondFamilyName'),
  nacionalidad: sd('ExtensionNationality'),
  municipio: sd('ExtensionDivipolaMunicipality'),
  zonaResidencia: sd('ExtensionResidenceZone'),
  ocupacion: sd('ExtensionOccupation'),
  modalidad: sd('ExtensionCareModality'),
  finalidad: sd('ExtensionConsultationPurpose'),
  causaExterna: sd('ExtensionExternalCause'),
  incapacidad: sd('ExtensionDisability'),
  tipoDiagnostico: sd('ExtensionDiagnosisType'),
} as const

export const SISTEMA = {
  tipoDocumento: cs('ColombianPersonIdentifier'),
  documentoPersona: cs('ColombianPersonIdentifier'), // system del Identifier.value
  sexoBiologico: cs('BiologicalSex'),
  zona: cs('ResidenceZone'),
  tipoCobertura: cs('CoverageType'),
  eps: cs('HealthAdministrator'),
  reps: cs('REPS'), // código de habilitación del prestador
  nit: cs('NIT'),
  divipola: cs('DIVIPOLA'),
  especialidad: cs('HealthSpecialty'),
  rethus: cs('ReTHUS'),
  rolDiagnostico: cs('DiagnosisRole'),
  tipoDiagnostico: cs('DiagnosisType'),
  modalidad: cs('CareModality'),
  finalidad: cs('ConsultationPurpose'),
  causaExterna: cs('ExternalCause'),
  origenIncapacidad: cs('DisabilityOrigin'),
  cie10: cs('CIE10'),
  cups: cs('CUPS'),
  ciuo: cs('CIUO08AC'),
  cum: cs('CUM-INVIMA'),
  atc: 'http://www.whocc.no/atc',
  loinc: 'http://loinc.org',
  snomed: 'http://snomed.info/sct',
  actCode: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
  conditionCategory: 'http://terminology.hl7.org/CodeSystem/condition-category',
  conditionClinical: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
  conditionVerification: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
  allergyClinical: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
  observationCategory: 'http://terminology.hl7.org/CodeSystem/observation-category',
  participationType: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
  compositionId: `${RDA_BASE}/sid/composition`,
} as const

// Tipo de documento clínico y secciones (LOINC).
export const LOINC = {
  documento: { code: '11488-4', display: 'Consult note' },
  seccionDiagnosticos: { code: '29548-5', display: 'Diagnosis Narrative' },
  seccionProcedimientos: { code: '47519-4', display: 'History of Procedures Document' },
  seccionMedicamentos: { code: '10160-0', display: 'History of Medication use Narrative' },
  seccionAlergias: { code: '48765-2', display: 'Allergies and adverse reactions Document' },
  seccionPagador: { code: '48768-6', display: 'Payment sources Document' },
} as const

// Secciones/códigos propios del RDA sin equivalente LOINC claro.
export const CODIGO_RDA = {
  system: cs('RDASection'),
  seccionFactoresRiesgo: { code: 'factores-riesgo', display: 'Factores de riesgo' },
  seccionIncapacidad: { code: 'incapacidad', display: 'Incapacidad' },
  factorRiesgo: { code: 'factor-riesgo', display: 'Factor de riesgo' },
} as const

// ---------- Catálogos (Res. 2275/2023 RIPS) ----------
export const TIPOS_DOCUMENTO = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  CD: 'Carné diplomático',
  PA: 'Pasaporte',
  SC: 'Salvoconducto de permanencia',
  PE: 'Permiso especial de permanencia',
  PT: 'Permiso por protección temporal',
  RC: 'Registro civil',
  TI: 'Tarjeta de identidad',
  CN: 'Certificado de nacido vivo',
  AS: 'Adulto sin identificar',
  MS: 'Menor sin identificar',
  DE: 'Documento extranjero',
  SI: 'Sin identificación',
} as const
export type TipoDocumentoCo = keyof typeof TIPOS_DOCUMENTO

export const SEXOS = { H: 'Hombre', M: 'Mujer', I: 'Indeterminado' } as const
export type SexoCo = keyof typeof SEXOS
/** Sexo biológico RIPS → Patient.gender administrativo de FHIR. */
export const SEXO_A_GENDER: Record<SexoCo, 'male' | 'female' | 'other'> = { H: 'male', M: 'female', I: 'other' }

export const TIPOS_COBERTURA = {
  contributivo: 'Régimen contributivo',
  subsidiado: 'Régimen subsidiado',
  especial: 'Régimen especial',
  excepcion: 'Régimen de excepción',
  prepagada: 'Medicina prepagada',
  soat: 'SOAT',
  particular: 'Particular (pago directo)',
  otro: 'Otro',
} as const
export type TipoCoberturaCo = keyof typeof TIPOS_COBERTURA

export const MODALIDADES = { intramural: 'Intramural', extramural: 'Extramural', telemedicina: 'Telemedicina' } as const
export type ModalidadCo = keyof typeof MODALIDADES

export const TIPOS_DIAGNOSTICO = {
  '01': 'Impresión diagnóstica',
  '02': 'Confirmado nuevo',
  '03': 'Confirmado repetido',
} as const
export type TipoDiagnosticoCo = keyof typeof TIPOS_DIAGNOSTICO

export const ORIGENES_INCAPACIDAD = { comun: 'Enfermedad general', laboral: 'Laboral', transito: 'Accidente de tránsito' } as const
export type OrigenIncapacidadCo = keyof typeof ORIGENES_INCAPACIDAD

// ---------- Formatos de códigos ----------
export const FORMATO = {
  cie10: /^[A-Z]\d{2}(\.?[0-9X]{1,2})?$/,
  cups: /^\d{6}$/,
  atc: /^[A-Z](\d{2}([A-Z]([A-Z](\d{2})?)?)?)?$/,
  cum: /^\d{1,10}(-\d{1,3})?$/,
  ciuo: /^\d{4}$/,
  habilitacion: /^\d{10,12}$/,
  nit: /^\d{6,15}$/,
  divipola: /^\d{5}$/,
  fecha: /^\d{4}-\d{2}-\d{2}$/,
  fechaHora: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/,
} as const
