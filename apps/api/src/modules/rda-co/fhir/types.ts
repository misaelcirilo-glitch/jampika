// Subconjunto de tipos FHIR R4 usados por el RDA de consulta externa (Minsalud CO).
// Solo lo que generamos; no pretende cubrir toda la especificación.

export interface Coding {
  system?: string
  code?: string
  display?: string
}

export interface CodeableConcept {
  coding?: Coding[]
  text?: string
}

export interface Identifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary'
  type?: CodeableConcept
  system?: string
  value?: string
}

export interface Reference {
  reference?: string
  display?: string
}

export interface Period {
  start?: string
  end?: string
}

export interface Quantity {
  value?: number
  unit?: string
  system?: string
  code?: string
}

export interface Extension {
  url: string
  valueString?: string
  valueCode?: string
  valueInteger?: number
  valueDate?: string
  valueCoding?: Coding
  valueCodeableConcept?: CodeableConcept
  valuePeriod?: Period
  extension?: Extension[]
}

export interface HumanName {
  use?: 'official' | 'usual'
  text?: string
  family?: string
  given?: string[]
  extension?: Extension[]
  _family?: { extension?: Extension[] }
}

export interface ContactPoint {
  system: 'phone' | 'email'
  value: string
  use?: 'home' | 'mobile' | 'work'
}

export interface Address {
  text?: string
  city?: string
  country?: string
  extension?: Extension[]
}

export interface Narrative {
  status: 'generated' | 'extensions' | 'additional' | 'empty'
  div: string
}

export interface Meta {
  profile?: string[]
  lastUpdated?: string
}

interface ResourceBase {
  id?: string
  meta?: Meta
  text?: Narrative
  extension?: Extension[]
}

export interface Patient extends ResourceBase {
  resourceType: 'Patient'
  identifier: Identifier[]
  name: HumanName[]
  gender?: 'male' | 'female' | 'other' | 'unknown'
  birthDate?: string
  telecom?: ContactPoint[]
  address?: Address[]
}

export interface Practitioner extends ResourceBase {
  resourceType: 'Practitioner'
  identifier: Identifier[]
  name: HumanName[]
  qualification?: { identifier?: Identifier[]; code: CodeableConcept }[]
}

export interface Organization extends ResourceBase {
  resourceType: 'Organization'
  identifier: Identifier[]
  name: string
  type?: CodeableConcept[]
  address?: Address[]
}

export interface Coverage extends ResourceBase {
  resourceType: 'Coverage'
  status: 'active' | 'cancelled' | 'draft' | 'entered-in-error'
  type?: CodeableConcept
  subscriberId?: string
  beneficiary: Reference
  payor: Reference[]
}

export interface Encounter extends ResourceBase {
  resourceType: 'Encounter'
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown'
  class: Coding
  type?: CodeableConcept[]
  serviceType?: CodeableConcept
  subject: Reference
  participant?: { type?: CodeableConcept[]; individual?: Reference }[]
  period: Period
  reasonCode?: CodeableConcept[]
  diagnosis?: { condition: Reference; use?: CodeableConcept; rank?: number }[]
  serviceProvider?: Reference
}

export interface Condition extends ResourceBase {
  resourceType: 'Condition'
  clinicalStatus?: CodeableConcept
  verificationStatus?: CodeableConcept
  category?: CodeableConcept[]
  code: CodeableConcept
  subject: Reference
  encounter?: Reference
  recordedDate?: string
  recorder?: Reference
}

export interface Procedure extends ResourceBase {
  resourceType: 'Procedure'
  status: 'preparation' | 'in-progress' | 'not-done' | 'on-hold' | 'stopped' | 'completed' | 'entered-in-error' | 'unknown'
  code: CodeableConcept
  subject: Reference
  encounter?: Reference
  performedDateTime?: string
  performer?: { actor: Reference }[]
}

export interface Dosage {
  text?: string
  timing?: { code?: CodeableConcept }
  route?: CodeableConcept
  doseAndRate?: { doseQuantity?: Quantity }[]
  patientInstruction?: string
}

export interface MedicationRequest extends ResourceBase {
  resourceType: 'MedicationRequest'
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown'
  intent: 'proposal' | 'plan' | 'order' | 'original-order'
  medicationCodeableConcept: CodeableConcept
  subject: Reference
  encounter?: Reference
  authoredOn?: string
  requester?: Reference
  dosageInstruction?: Dosage[]
  dispenseRequest?: { expectedSupplyDuration?: Quantity }
}

export interface AllergyIntolerance extends ResourceBase {
  resourceType: 'AllergyIntolerance'
  clinicalStatus?: CodeableConcept
  verificationStatus?: CodeableConcept
  category?: ('food' | 'medication' | 'environment' | 'biologic')[]
  criticality?: 'low' | 'high' | 'unable-to-assess'
  code: CodeableConcept
  patient: Reference
  encounter?: Reference
}

export interface Observation extends ResourceBase {
  resourceType: 'Observation'
  status: 'registered' | 'preliminary' | 'final' | 'amended'
  category?: CodeableConcept[]
  code: CodeableConcept
  subject: Reference
  encounter?: Reference
  effectiveDateTime?: string
  valueCodeableConcept?: CodeableConcept
  valueString?: string
}

export interface CompositionSection {
  title: string
  code?: CodeableConcept
  text?: Narrative
  entry?: Reference[]
  emptyReason?: CodeableConcept
}

export interface Composition extends ResourceBase {
  resourceType: 'Composition'
  identifier?: Identifier
  status: 'preliminary' | 'final' | 'amended' | 'entered-in-error'
  type: CodeableConcept
  subject: Reference
  encounter?: Reference
  date: string
  author: Reference[]
  title: string
  custodian?: Reference
  section: CompositionSection[]
}

export type RdaResource =
  | Composition
  | Patient
  | Practitioner
  | Organization
  | Coverage
  | Encounter
  | Condition
  | Procedure
  | MedicationRequest
  | AllergyIntolerance
  | Observation

export interface BundleEntry {
  fullUrl: string
  resource: RdaResource
}

export interface Bundle {
  resourceType: 'Bundle'
  id?: string
  meta?: Meta
  identifier: Identifier
  type: 'document'
  timestamp: string
  entry: BundleEntry[]
}
