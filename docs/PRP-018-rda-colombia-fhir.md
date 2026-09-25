# PRP-018 — RDA Colombia (Registro Digital de Atención, FHIR R4)

**Estado**: Fase 1 completada (generación LOCAL del Bundle). Envío a Minsalud: pendiente (requiere API Key de una IPS colombiana).
**Guía**: RDA consulta externa, FHIR R4, Minsalud CO — **STU1 borrador** (los perfiles pueden cambiar).

## Objetivo
Generar, desde una historia clínica de Jampika, el Bundle FHIR `document` del RDA de consulta externa y validarlo en local, sin tocar el core.

## Diseño (aislamiento)
- **Datos**: migración `20260926120000_rda_colombia` — 100% aditiva. Tablas 1:1 `rda_ips_co` (clinics), `rda_profesionales_co` (users), `rda_pacientes_co` (patients), `rda_consultas_co` (medical_records, append-only). Enums: `co_tipo_documento`, `co_sexo`, `co_zona_residencia`, `co_tipo_cobertura`, `co_modalidad_atencion`. Modelos Prisma scalar-only (FKs en SQL): no alteran `Patient`/`User`/`Clinic`/`MedicalRecord`, así que el resto de la API funciona aunque la migración no esté aplicada.
- **Código**: `apps/api/src/modules/rda-co/`
  - `fhir/perfiles.ts` — ÚNICO sitio con canonicals del IG, sistemas de códigos, catálogos y regex. **Verificar las URLs contra el IG vigente antes de conectar.**
  - `fhir/types.ts` — tipos FHIR R4 (Bundle, Composition, Patient, Practitioner, Organization, Coverage, Encounter, Condition, Procedure, MedicationRequest, AllergyIntolerance, Observation).
  - `fhir/recursos.ts`, `fhir/recursos-clinicos.ts`, `fhir/bundle.ts` — generador puro `generarBundleRda(input, {newId, now})`.
  - `fhir/validar.ts` — `validarBundleRda(bundle)` → `{ valido, errores, advertencias }` (estructura document, referencias `urn:uuid` resueltas, 1 Patient/Encounter/Coverage, 1 dx principal, formatos CIE-10/CUPS/ATC/CUM/CIUO/REPS/NIT).
  - `mapper.ts` — `construirInputRda(fuentes)`: prioriza datos codificados `rda_*_co` y cae a campos del core.
  - `rda.routes.ts` — `GET /api/v1/rda-co/records/:recordId/bundle` → `{ bundle, validacion }` (doctor/admin, filtrado por clinicId).
  - `rda.test.ts` — 7 tests.

## Mapeo Jampika → RDA
| Dato RDA | En Jampika antes | Estado | Dónde queda |
|---|---|---|---|
| Tipo documento paciente (CC, TI, CE, PA, RC…) | `patients.document_type` texto libre (CC/CE/TI/PASAPORTE; sin RC, CN, PT…) | Parcial | `rda_pacientes_co.tipo_documento` (enum); fallback mapea PASAPORTE→PA |
| Número documento | `patients.document_number` | ✅ | core |
| Nombres / apellidos | `first_name` / `last_name` (sin separar) | Parcial | `primer/segundo_nombre`, `primer/segundo_apellido`; fallback parte por espacios |
| Fecha nacimiento | `birth_date` | ✅ | core |
| Sexo | `gender` M/F/other (administrativo) | Parcial | `rda_pacientes_co.sexo` (H/M/I biológico); fallback M→H, F→M |
| Dirección | `address` texto | Parcial | + `municipio_divipola`, `zona_residencia` |
| Teléfono / email | `phone` / `email` | ✅ | core |
| Encounter fecha | `medical_records.record_date` | ✅ | core |
| Encounter tipo | `record_type = consultation` | ✅ | class AMB (VR si telemedicina) |
| Encounter estado | — (se deriva de `is_signed`) | Derivado | firmado → finished |
| Modalidad / finalidad / causa externa | — | Faltaba | `rda_consultas_co` |
| Pagador (EPS / particular) | `insurance_provider` / `insurance_number` texto | Parcial | `tipo_cobertura`, `eps_codigo`, `eps_nombre`, `numero_afiliacion` (paciente + snapshot en consulta) |
| Ocupación CIUO | — | Faltaba | `rda_pacientes_co.ocupacion_ciuo` |
| Diagnósticos CIE-10 | `medical_records.diagnoses` [{code, description}] | Parcial (sin rol/tipo) | `rda_consultas_co.diagnosticos` con rol principal/relacionado + tipo 01/02/03; fallback: 1º = principal |
| Procedimientos CUPS | — | Faltaba | `rda_consultas_co.procedimientos` |
| Medicamentos ATC/CUM, dosis, frecuencia, vía | `prescriptions` texto (sin código, sin vía) | Parcial | `rda_consultas_co.medicamentos`; fallback texto (advertencia) |
| Alergias | `patients.allergies` string[] | Parcial | `rda_consultas_co.alergias` codificadas; fallback texto |
| Factores de riesgo | `chronic_conditions` (aprox.) | Parcial | `rda_consultas_co.factores_riesgo`; fallback chronic_conditions |
| Incapacidad | — | Faltaba | `rda_consultas_co.incapacidad` (días, inicio, origen) → extensión en Encounter + sección |
| Profesional: tipo/número doc | — | Faltaba | `rda_profesionales_co` |
| Profesional: nombre / especialidad | `users.first_name/last_name/specialty/license_number` | ✅/Parcial | + `especialidad_codigo` |
| IPS: código habilitación REPS | — | Faltaba | `rda_ips_co.codigo_habilitacion` |
| IPS: NIT / nombre | `clinics.tax_id` / `name` | ✅ | `rda_ips_co.nit`, `razon_social` (fallback core) |

## Pendiente (siguientes fases)
1. Aplicar la migración en Neon (aditiva; orden: migración → API).
2. UI para capturar los datos `rda_*_co` (solo clínicas con `country = CO`) + endpoints de escritura con Zod.
3. Catálogos locales (CIE-10 CO, CUPS, CIUO-08 AC, ATC/CUM, DIVIPOLA, EPS) para autocompletar.
4. Contrastar `perfiles.ts` con el IG oficial y pasar el Bundle por el validador FHIR del Ministerio.
5. Cliente de envío a la API de Minsalud (requiere API Key de IPS) — módulo aparte.
