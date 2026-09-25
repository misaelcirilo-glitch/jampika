import { describe, expect, it } from 'vitest'
import { generarBundleRda } from './fhir/bundle.js'
import { SISTEMA } from './fhir/perfiles.js'
import { validarBundleRda } from './fhir/validar.js'
import { construirInputRda, type FuentesRda } from './mapper.js'
import type { ConsultaRdaInput } from './types.js'

let n = 0
const opts = { newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`, now: () => new Date('2026-09-26T15:00:00Z') }

const completo = (): ConsultaRdaInput => ({
  consulta: { id: 'rec-1', fecha: '2026-09-26T14:30:00Z', estado: 'finished', modalidad: 'intramural', finalidad: '10', causaExterna: '38', motivo: 'Dolor de garganta' },
  paciente: {
    id: 'pac-1', tipoDocumento: 'CC', numeroDocumento: '1020304050', primerNombre: 'Ana', segundoNombre: 'María',
    primerApellido: 'Gómez', segundoApellido: 'Rojas', fechaNacimiento: '1990-05-12', sexo: 'M', direccion: 'Cra 7 # 12-34',
    municipioDivipola: '11001', zonaResidencia: 'U', paisNacionalidad: '170', telefono: '+573001234567', email: 'ana@example.com',
    ocupacionCiuo: '2221', ocupacionDescripcion: 'Profesionales de enfermería',
  },
  pagador: { tipoCobertura: 'contributivo', epsCodigo: 'EPS037', epsNombre: 'Nueva EPS', numeroAfiliacion: 'A-123' },
  profesional: { id: 'doc-1', tipoDocumento: 'CC', numeroDocumento: '79000111', nombres: 'Luis', apellidos: 'Pérez', especialidadCodigo: '355', especialidadNombre: 'Medicina general', registroProfesional: 'RM-123' },
  ips: { id: 'ips-1', codigoHabilitacion: '110010123401', nit: '900123456', digitoVerificacion: '7', razonSocial: 'IPS Demo SAS', municipioDivipola: '11001' },
  diagnosticos: [
    { codigo: 'J02.9', descripcion: 'Faringitis aguda', rol: 'principal', tipo: '02' },
    { codigo: 'R50.9', descripcion: 'Fiebre', rol: 'relacionado', tipo: '01' },
  ],
  procedimientos: [{ cups: '890201', descripcion: 'Consulta de primera vez por medicina general' }],
  medicamentos: [{ sistema: 'ATC', codigo: 'N02BE01', nombre: 'Acetaminofén 500 mg', dosis: '500', unidad: 'mg', frecuencia: 'cada 8 horas', via: 'oral', duracion: '5 días' }],
  alergias: [{ sustancia: 'Penicilina', categoria: 'medication', criticidad: 'high' }],
  factoresRiesgo: [{ descripcion: 'Tabaquismo' }],
  incapacidad: { dias: 3, fechaInicio: '2026-09-26', origen: 'comun' },
})

describe('generarBundleRda', () => {
  it('genera un Bundle document válido con todos los recursos', () => {
    const b = generarBundleRda(completo(), opts)
    const tipos = b.entry.map((e) => e.resource.resourceType)
    expect(b.type).toBe('document')
    expect(tipos[0]).toBe('Composition')
    for (const t of ['Patient', 'Practitioner', 'Organization', 'Coverage', 'Encounter', 'Condition', 'Procedure', 'MedicationRequest', 'AllergyIntolerance', 'Observation']) {
      expect(tipos).toContain(t)
    }
    const v = validarBundleRda(b)
    expect(v.errores).toEqual([])
    expect(v.valido).toBe(true)
  })

  it('mapea sexo biológico, CIE-10 sin punto y diagnóstico principal rank 1', () => {
    const b = generarBundleRda(completo(), opts)
    const pat = b.entry.find((e) => e.resource.resourceType === 'Patient')!.resource
    expect(pat.resourceType === 'Patient' && pat.gender).toBe('female')
    const enc = b.entry.find((e) => e.resource.resourceType === 'Encounter')!.resource
    if (enc.resourceType !== 'Encounter') throw new Error()
    expect(enc.diagnosis?.[0]?.use?.coding?.[0]?.code).toBe('principal')
    expect(enc.extension?.some((x) => x.url.includes('Disability'))).toBe(true)
    const cond = b.entry.find((e) => e.resource.resourceType === 'Condition')!.resource
    expect(cond.resourceType === 'Condition' && cond.code.coding?.[0]).toMatchObject({ system: SISTEMA.cie10, code: 'J029' })
  })

  it('particular: Coverage con payor = paciente y sin Organization EPS', () => {
    const input = { ...completo(), pagador: { tipoCobertura: 'particular' as const } }
    const b = generarBundleRda(input, opts)
    const cov = b.entry.find((e) => e.resource.resourceType === 'Coverage')!.resource
    expect(cov.resourceType === 'Coverage' && cov.payor[0]?.reference).toBe('urn:uuid:pac-1')
    expect(b.entry.filter((e) => e.resource.resourceType === 'Organization')).toHaveLength(1)
    expect(validarBundleRda(b).valido).toBe(true)
  })
})

describe('validarBundleRda', () => {
  it('detecta códigos inválidos y datos obligatorios faltantes', () => {
    const input = completo()
    input.ips.codigoHabilitacion = ''
    input.paciente.sexo = null
    input.diagnosticos = [{ codigo: 'XX', descripcion: 'malo', rol: 'relacionado' }]
    input.procedimientos = [{ cups: '12', descripcion: 'x' }]
    const v = validarBundleRda(generarBundleRda(input, opts))
    const rutas = v.errores.map((e) => e.ruta)
    expect(v.valido).toBe(false)
    expect(rutas).toContain('Organization(IPS).identifier[REPS]')
    expect(rutas).toContain('Patient.extension[sexoBiologico]')
    expect(rutas).toContain('Condition[0].code')
    expect(rutas).toContain('Procedure[0].code')
    expect(rutas).toContain('Encounter.diagnosis')
  })

  it('detecta referencias rotas', () => {
    const b = generarBundleRda(completo(), opts)
    b.entry = b.entry.filter((e) => e.resource.resourceType !== 'Practitioner')
    const v = validarBundleRda(b)
    expect(v.errores.some((e) => e.mensaje.startsWith('Referencia sin resolver'))).toBe(true)
  })
})

describe('construirInputRda (fallback a datos del core)', () => {
  const fuentes: FuentesRda = {
    record: {
      id: 'rec-2', recordDate: new Date('2026-09-20T10:00:00Z'), isSigned: true, subjective: 'Cefalea',
      diagnoses: [{ code: 'r51', description: 'Cefalea' }],
      prescriptions: [{ medication: 'Ibuprofeno 400 mg', dosage: '400 mg', frequency: 'c/8h', duration: '3 días' }],
    },
    patient: {
      id: 'pac-2', documentType: 'PASAPORTE', documentNumber: 'AB123', firstName: 'Juan Carlos', lastName: 'Ruiz Díaz',
      birthDate: new Date('1985-01-02'), gender: 'M', phone: null, email: null, address: 'Calle 1',
      insuranceProvider: null, insuranceNumber: null, allergies: ['Látex'], chronicConditions: ['HTA'],
    },
    doctor: { id: 'doc-2', firstName: 'Eva', lastName: 'Luna', specialty: 'Medicina general', licenseNumber: 'RM9' },
    clinic: { id: 'cli-2', name: 'Consultorio Eva', taxId: '900555444-1' },
    rdaProfesional: { tipoDocumento: 'CC', numeroDocumento: '52000111', especialidadCodigo: null, especialidadNombre: null, registroProfesional: null },
    rdaIps: { codigoHabilitacion: '050010000101', nit: '900555444', digitoVerificacion: '1', razonSocial: 'Consultorio Eva SAS', municipioDivipola: '05001' },
  }

  it('usa campos core: PASAPORTE→PA, gender M→H, primer dx principal, particular', () => {
    const input = construirInputRda(fuentes)
    expect(input.paciente).toMatchObject({ tipoDocumento: 'PA', sexo: 'H', primerNombre: 'Juan', segundoNombre: 'Carlos', primerApellido: 'Ruiz', segundoApellido: 'Díaz' })
    expect(input.diagnosticos[0]).toMatchObject({ codigo: 'R51', rol: 'principal' })
    expect(input.pagador.tipoCobertura).toBe('particular')
    expect(input.medicamentos[0]?.sistema).toBeUndefined()
    const v = validarBundleRda(generarBundleRda(input, opts))
    expect(v.errores).toEqual([])
    // Medicamento sin código ATC/CUM y sin ocupación → solo advertencias.
    expect(v.advertencias.map((a) => a.ruta)).toEqual(expect.arrayContaining(['MedicationRequest[0].medication', 'Patient.extension[ocupacion]']))
  })

  it('sin datos rda del profesional → error de documento del profesional', () => {
    const v = validarBundleRda(generarBundleRda(construirInputRda({ ...fuentes, rdaProfesional: null }), opts))
    expect(v.errores.some((e) => e.ruta.startsWith('Practitioner.identifier'))).toBe(true)
  })
})
