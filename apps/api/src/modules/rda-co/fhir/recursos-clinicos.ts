// Recursos clínicos del RDA: diagnósticos, procedimientos, medicamentos, alergias, factores de riesgo.
import type { RdaAlergia, RdaDiagnostico, RdaFactorRiesgo, RdaMedicamento, RdaProcedimiento } from '../types.js'
import { CODIGO_RDA, EXTENSION, PERFIL, SISTEMA, TIPOS_DIAGNOSTICO } from './perfiles.js'
import type { AllergyIntolerance, Condition, Dosage, MedicationRequest, Observation, Procedure } from './types.js'
import { ref } from './recursos.js'

export interface Contexto {
  pacienteId: string
  encounterId: string
  profesionalId: string
  fecha: string
}

export function crearCondition(id: string, d: RdaDiagnostico, ctx: Contexto): Condition {
  const confirmado = d.tipo === '02' || d.tipo === '03'
  return {
    resourceType: 'Condition',
    id,
    meta: { profile: [PERFIL.condition] },
    extension: d.tipo
      ? [{ url: EXTENSION.tipoDiagnostico, valueCoding: { system: SISTEMA.tipoDiagnostico, code: d.tipo, display: TIPOS_DIAGNOSTICO[d.tipo] } }]
      : undefined,
    clinicalStatus: { coding: [{ system: SISTEMA.conditionClinical, code: 'active' }] },
    verificationStatus: { coding: [{ system: SISTEMA.conditionVerification, code: confirmado ? 'confirmed' : 'provisional' }] },
    category: [{ coding: [{ system: SISTEMA.conditionCategory, code: 'encounter-diagnosis' }] }],
    code: { coding: [{ system: SISTEMA.cie10, code: d.codigo.replace('.', ''), display: d.descripcion }], text: d.descripcion },
    subject: ref(ctx.pacienteId),
    encounter: ref(ctx.encounterId),
    recordedDate: ctx.fecha,
    recorder: ref(ctx.profesionalId),
  }
}

export function crearProcedure(id: string, p: RdaProcedimiento, ctx: Contexto): Procedure {
  return {
    resourceType: 'Procedure',
    id,
    meta: { profile: [PERFIL.procedure] },
    status: 'completed',
    code: { coding: [{ system: SISTEMA.cups, code: p.cups, display: p.descripcion }], text: p.descripcion },
    subject: ref(ctx.pacienteId),
    encounter: ref(ctx.encounterId),
    performedDateTime: ctx.fecha,
    performer: [{ actor: ref(ctx.profesionalId) }],
  }
}

function dosificacion(m: RdaMedicamento): Dosage {
  const texto = [m.dosis && `${m.dosis}${m.unidad ? ` ${m.unidad}` : ''}`, m.frecuencia, m.via && `vía ${m.via}`, m.duracion && `por ${m.duracion}`]
    .filter(Boolean)
    .join(', ')
  const dosisNum = m.dosis ? Number.parseFloat(m.dosis.replace(',', '.')) : Number.NaN
  return {
    text: texto || undefined,
    timing: m.frecuencia ? { code: { text: m.frecuencia } } : undefined,
    route: m.via ? { text: m.via } : undefined,
    doseAndRate: Number.isFinite(dosisNum) ? [{ doseQuantity: { value: dosisNum, unit: m.unidad ?? undefined } }] : undefined,
    patientInstruction: m.indicaciones ?? undefined,
  }
}

export function crearMedicationRequest(id: string, m: RdaMedicamento, ctx: Contexto): MedicationRequest {
  const system = m.sistema === 'ATC' ? SISTEMA.atc : m.sistema === 'CUM' ? SISTEMA.cum : undefined
  return {
    resourceType: 'MedicationRequest',
    id,
    meta: { profile: [PERFIL.medicationRequest] },
    status: 'active',
    intent: 'order',
    medicationCodeableConcept: {
      coding: system && m.codigo ? [{ system, code: m.codigo, display: m.nombre }] : undefined,
      text: m.nombre,
    },
    subject: ref(ctx.pacienteId),
    encounter: ref(ctx.encounterId),
    authoredOn: ctx.fecha,
    requester: ref(ctx.profesionalId),
    dosageInstruction: [dosificacion(m)],
  }
}

export function crearAllergyIntolerance(id: string, a: RdaAlergia, ctx: Contexto): AllergyIntolerance {
  return {
    resourceType: 'AllergyIntolerance',
    id,
    meta: { profile: [PERFIL.allergyIntolerance] },
    clinicalStatus: { coding: [{ system: SISTEMA.allergyClinical, code: 'active' }] },
    category: a.categoria ? [a.categoria] : undefined,
    criticality: a.criticidad ?? undefined,
    code: {
      coding: a.codigo ? [{ system: SISTEMA.snomed, code: a.codigo, display: a.sustancia }] : undefined,
      text: a.sustancia,
    },
    patient: ref(ctx.pacienteId),
    encounter: ref(ctx.encounterId),
  }
}

export function crearFactorRiesgo(id: string, f: RdaFactorRiesgo, ctx: Contexto): Observation {
  return {
    resourceType: 'Observation',
    id,
    meta: { profile: [PERFIL.observation] },
    status: 'final',
    category: [{ coding: [{ system: SISTEMA.observationCategory, code: 'social-history' }] }],
    code: { coding: [{ system: CODIGO_RDA.system, ...CODIGO_RDA.factorRiesgo }] },
    subject: ref(ctx.pacienteId),
    encounter: ref(ctx.encounterId),
    effectiveDateTime: ctx.fecha,
    valueCodeableConcept: {
      coding: f.codigo ? [{ system: SISTEMA.snomed, code: f.codigo, display: f.descripcion }] : undefined,
      text: f.descripcion,
    },
  }
}
