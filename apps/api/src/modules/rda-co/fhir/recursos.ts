// Constructores de recursos FHIR individuales del RDA (funciones puras).
import type { RdaIps, RdaPagador, RdaPaciente, RdaProfesional, RdaConsulta } from '../types.js'
import {
  EXTENSION,
  MODALIDADES,
  PERFIL,
  SEXO_A_GENDER,
  SEXOS,
  SISTEMA,
  TIPOS_COBERTURA,
  TIPOS_DOCUMENTO,
} from './perfiles.js'
import type { Coverage, Encounter, Extension, Identifier, Organization, Patient, Practitioner, Reference } from './types.js'

export const ref = (id: string, display?: string): Reference => ({ reference: `urn:uuid:${id}`, ...(display ? { display } : {}) })

function identificadorPersona(tipo: keyof typeof TIPOS_DOCUMENTO, numero: string): Identifier {
  return {
    use: 'official',
    type: { coding: [{ system: SISTEMA.tipoDocumento, code: tipo, display: TIPOS_DOCUMENTO[tipo] }] },
    system: `${SISTEMA.documentoPersona}/${tipo}`,
    value: numero,
  }
}

function extensionesPaciente(p: RdaPaciente): Extension[] {
  const ext: Extension[] = []
  if (p.sexo) {
    ext.push({ url: EXTENSION.sexoBiologico, valueCoding: { system: SISTEMA.sexoBiologico, code: p.sexo, display: SEXOS[p.sexo] } })
  }
  if (p.paisNacionalidad) ext.push({ url: EXTENSION.nacionalidad, valueCode: p.paisNacionalidad })
  if (p.zonaResidencia) ext.push({ url: EXTENSION.zonaResidencia, valueCoding: { system: SISTEMA.zona, code: p.zonaResidencia } })
  if (p.ocupacionCiuo) {
    ext.push({
      url: EXTENSION.ocupacion,
      valueCodeableConcept: {
        coding: [{ system: SISTEMA.ciuo, code: p.ocupacionCiuo, display: p.ocupacionDescripcion ?? undefined }],
        text: p.ocupacionDescripcion ?? undefined,
      },
    })
  }
  return ext
}

export function crearPatient(p: RdaPaciente): Patient {
  const given = [p.primerNombre, p.segundoNombre].filter((s): s is string => !!s?.trim())
  const family = [p.primerApellido, p.segundoApellido].filter(Boolean).join(' ')
  const telecom: Patient['telecom'] = []
  if (p.telefono) telecom.push({ system: 'phone', value: p.telefono, use: 'mobile' })
  if (p.email) telecom.push({ system: 'email', value: p.email })
  const address = p.direccion || p.municipioDivipola
    ? [{
        text: p.direccion ?? undefined,
        city: p.municipioDivipola ?? undefined,
        country: 'CO',
        extension: p.municipioDivipola
          ? [{ url: EXTENSION.municipio, valueCoding: { system: SISTEMA.divipola, code: p.municipioDivipola } }]
          : undefined,
      }]
    : undefined
  return {
    resourceType: 'Patient',
    id: p.id,
    meta: { profile: [PERFIL.patient] },
    extension: extensionesPaciente(p),
    identifier: [identificadorPersona(p.tipoDocumento, p.numeroDocumento)],
    name: [{
      use: 'official',
      text: [...given, family].join(' '),
      family,
      given,
      _family: p.segundoApellido
        ? { extension: [{ url: EXTENSION.segundoApellido, valueString: p.segundoApellido }] }
        : undefined,
    }],
    gender: p.sexo ? SEXO_A_GENDER[p.sexo] : 'unknown',
    birthDate: p.fechaNacimiento ?? undefined,
    telecom: telecom.length ? telecom : undefined,
    address,
  }
}

export function crearPractitioner(pr: RdaProfesional): Practitioner {
  const qualification: Practitioner['qualification'] = []
  if (pr.especialidadCodigo || pr.especialidadNombre) {
    qualification.push({
      identifier: pr.registroProfesional ? [{ system: SISTEMA.rethus, value: pr.registroProfesional }] : undefined,
      code: {
        coding: pr.especialidadCodigo ? [{ system: SISTEMA.especialidad, code: pr.especialidadCodigo, display: pr.especialidadNombre ?? undefined }] : undefined,
        text: pr.especialidadNombre ?? undefined,
      },
    })
  }
  return {
    resourceType: 'Practitioner',
    id: pr.id,
    meta: { profile: [PERFIL.practitioner] },
    identifier: [identificadorPersona(pr.tipoDocumento, pr.numeroDocumento)],
    name: [{ use: 'official', text: `${pr.nombres} ${pr.apellidos}`, family: pr.apellidos, given: pr.nombres.split(/\s+/) }],
    qualification: qualification.length ? qualification : undefined,
  }
}

export function crearOrganization(ips: RdaIps): Organization {
  const nit = ips.digitoVerificacion ? `${ips.nit}-${ips.digitoVerificacion}` : ips.nit
  return {
    resourceType: 'Organization',
    id: ips.id,
    meta: { profile: [PERFIL.organization] },
    identifier: [
      { use: 'official', system: SISTEMA.reps, value: ips.codigoHabilitacion },
      { use: 'secondary', system: SISTEMA.nit, value: nit },
    ],
    name: ips.razonSocial,
    address: ips.municipioDivipola
      ? [{ country: 'CO', extension: [{ url: EXTENSION.municipio, valueCoding: { system: SISTEMA.divipola, code: ips.municipioDivipola } }] }]
      : undefined,
  }
}

/**
 * Pagador. Particular = Coverage con payor = el propio paciente (convención FHIR
 * para self-pay); EPS = payor Organization contenida por código de administradora.
 */
export function crearCoverage(id: string, pagador: RdaPagador, pacienteId: string, epsOrgId?: string): Coverage {
  const esParticular = pagador.tipoCobertura === 'particular'
  return {
    resourceType: 'Coverage',
    id,
    meta: { profile: [PERFIL.coverage] },
    status: 'active',
    type: { coding: [{ system: SISTEMA.tipoCobertura, code: pagador.tipoCobertura, display: TIPOS_COBERTURA[pagador.tipoCobertura] }] },
    subscriberId: pagador.numeroAfiliacion ?? undefined,
    beneficiary: ref(pacienteId),
    payor: [esParticular || !epsOrgId ? ref(pacienteId) : ref(epsOrgId, pagador.epsNombre ?? undefined)],
  }
}

export function crearOrganizacionEps(id: string, pagador: RdaPagador): Organization {
  return {
    resourceType: 'Organization',
    id,
    meta: { profile: [PERFIL.organization] },
    identifier: [{ use: 'official', system: SISTEMA.eps, value: pagador.epsCodigo ?? '' }],
    name: pagador.epsNombre ?? pagador.epsCodigo ?? 'EPS',
  }
}

export function crearEncounter(c: RdaConsulta, pacienteId: string, profesionalId: string, ipsId: string): Encounter {
  const extension: Extension[] = [
    { url: EXTENSION.modalidad, valueCoding: { system: SISTEMA.modalidad, code: c.modalidad, display: MODALIDADES[c.modalidad] } },
  ]
  if (c.finalidad) extension.push({ url: EXTENSION.finalidad, valueCoding: { system: SISTEMA.finalidad, code: c.finalidad } })
  if (c.causaExterna) extension.push({ url: EXTENSION.causaExterna, valueCoding: { system: SISTEMA.causaExterna, code: c.causaExterna } })
  return {
    resourceType: 'Encounter',
    id: c.id,
    meta: { profile: [PERFIL.encounter] },
    extension,
    status: c.estado,
    class: { system: SISTEMA.actCode, code: c.modalidad === 'telemedicina' ? 'VR' : 'AMB', display: c.modalidad === 'telemedicina' ? 'virtual' : 'ambulatory' },
    type: [{ text: 'Consulta externa' }],
    subject: ref(pacienteId),
    participant: [{
      type: [{ coding: [{ system: SISTEMA.participationType, code: 'PPRF', display: 'primary performer' }] }],
      individual: ref(profesionalId),
    }],
    period: { start: c.fecha, end: c.fechaFin ?? undefined },
    reasonCode: c.motivo ? [{ text: c.motivo }] : undefined,
    serviceProvider: ref(ipsId),
  }
}
