-- RDA Colombia (Registro Digital de Atención, guía FHIR R4 Minsalud — STU1 borrador).
-- 100% ADITIVA y AISLADA: no toca patients / users / clinics / medical_records.
-- Los datos que Colombia exige y Jampika no tenía viven en tablas rda_*_co (1:1
-- con la entidad existente). Si los perfiles del Ministerio cambian, solo se
-- modifica este módulo. Si la migración no está aplicada, el resto de la app
-- no se ve afectada (los modelos Prisma son scalar-only, sin relaciones).

-- ---------- Enums (códigos Res. 2275/2023 RIPS / guía RDA) ----------
CREATE TYPE "co_tipo_documento" AS ENUM (
  'CC',  -- Cédula de ciudadanía
  'CE',  -- Cédula de extranjería
  'CD',  -- Carné diplomático
  'PA',  -- Pasaporte
  'SC',  -- Salvoconducto de permanencia
  'PE',  -- Permiso especial de permanencia
  'PT',  -- Permiso por protección temporal
  'RC',  -- Registro civil
  'TI',  -- Tarjeta de identidad
  'CN',  -- Certificado de nacido vivo
  'AS',  -- Adulto sin identificar
  'MS',  -- Menor sin identificar
  'DE',  -- Documento extranjero
  'SI'   -- Sin identificación
);

-- Sexo biológico (RIPS): H hombre, M mujer, I indeterminado/intersexual.
CREATE TYPE "co_sexo" AS ENUM ('H', 'M', 'I');

CREATE TYPE "co_zona_residencia" AS ENUM ('U', 'R'); -- urbana / rural

-- Pagador / cobertura de la atención.
CREATE TYPE "co_tipo_cobertura" AS ENUM (
  'contributivo',
  'subsidiado',
  'especial',
  'excepcion',
  'prepagada',
  'soat',
  'particular',
  'otro'
);

-- Modalidad de la atención (RDA consulta externa).
CREATE TYPE "co_modalidad_atencion" AS ENUM ('intramural', 'extramural', 'telemedicina');

-- ---------- IPS (1:1 con clinics) ----------
CREATE TABLE "rda_ips_co" (
  "clinic_id"             UUID NOT NULL,
  "codigo_habilitacion"   VARCHAR(12) NOT NULL, -- código REPS del prestador
  "nit"                   VARCHAR(15) NOT NULL, -- sin dígito de verificación
  "digito_verificacion"   VARCHAR(1),
  "razon_social"          TEXT NOT NULL,
  "municipio_divipola"    VARCHAR(5),           -- DANE DIVIPOLA (5 dígitos)
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rda_ips_co_pkey" PRIMARY KEY ("clinic_id")
);
ALTER TABLE "rda_ips_co" ADD CONSTRAINT "rda_ips_co_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------- Profesional (1:1 con users) ----------
CREATE TABLE "rda_profesionales_co" (
  "user_id"               UUID NOT NULL,
  "clinic_id"             UUID NOT NULL,
  "tipo_documento"        "co_tipo_documento" NOT NULL,
  "numero_documento"      VARCHAR(20) NOT NULL,
  "especialidad_codigo"   VARCHAR(10),   -- código de especialidad (ReTHUS / tabla Minsalud)
  "especialidad_nombre"   TEXT,
  "registro_profesional"  VARCHAR(30),   -- ReTHUS / tarjeta profesional
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rda_profesionales_co_pkey" PRIMARY KEY ("user_id")
);
CREATE INDEX "rda_profesionales_co_clinic_id_idx" ON "rda_profesionales_co"("clinic_id");
ALTER TABLE "rda_profesionales_co" ADD CONSTRAINT "rda_profesionales_co_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rda_profesionales_co" ADD CONSTRAINT "rda_profesionales_co_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------- Paciente (1:1 con patients) ----------
CREATE TABLE "rda_pacientes_co" (
  "patient_id"            UUID NOT NULL,
  "clinic_id"             UUID NOT NULL,
  "tipo_documento"        "co_tipo_documento" NOT NULL,
  "numero_documento"      VARCHAR(20) NOT NULL,
  "primer_nombre"         TEXT,
  "segundo_nombre"        TEXT,
  "primer_apellido"       TEXT,
  "segundo_apellido"      TEXT,
  "sexo"                  "co_sexo",
  "pais_nacionalidad"     VARCHAR(3) DEFAULT '170', -- ISO 3166-1 numérico (170 = Colombia)
  "municipio_divipola"    VARCHAR(5),
  "zona_residencia"       "co_zona_residencia",
  "ocupacion_ciuo"        VARCHAR(4),               -- CIUO-08 AC (4 dígitos)
  "ocupacion_descripcion" TEXT,
  "tipo_cobertura"        "co_tipo_cobertura" NOT NULL DEFAULT 'particular',
  "eps_codigo"            VARCHAR(10),              -- código administradora (EPS/EAPB)
  "eps_nombre"            TEXT,
  "numero_afiliacion"     VARCHAR(30),
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rda_pacientes_co_pkey" PRIMARY KEY ("patient_id")
);
CREATE INDEX "rda_pacientes_co_clinic_id_idx" ON "rda_pacientes_co"("clinic_id");
ALTER TABLE "rda_pacientes_co" ADD CONSTRAINT "rda_pacientes_co_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rda_pacientes_co" ADD CONSTRAINT "rda_pacientes_co_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------- Consulta externa (1:1 con medical_records; append-only igual que la HC) ----------
-- Snapshot del pagador al momento de la atención + datos clínicos codificados.
CREATE TABLE "rda_consultas_co" (
  "medical_record_id"     UUID NOT NULL,
  "clinic_id"             UUID NOT NULL,
  "patient_id"            UUID NOT NULL,
  "modalidad"             "co_modalidad_atencion" NOT NULL DEFAULT 'intramural',
  "finalidad"             VARCHAR(2),   -- finalidad de la consulta (RIPS)
  "causa_externa"         VARCHAR(2),   -- causa motivo de atención (RIPS)
  "tipo_cobertura"        "co_tipo_cobertura" NOT NULL DEFAULT 'particular',
  "eps_codigo"            VARCHAR(10),
  "eps_nombre"            TEXT,
  "numero_afiliacion"     VARCHAR(30),
  -- [{ codigo, descripcion, rol: 'principal'|'relacionado', tipo: '01'|'02'|'03' }]
  "diagnosticos"          JSONB NOT NULL DEFAULT '[]',
  -- [{ cups, descripcion }]
  "procedimientos"        JSONB NOT NULL DEFAULT '[]',
  -- [{ sistema: 'ATC'|'CUM', codigo, nombre, dosis, unidad, frecuencia, via, duracion, indicaciones }]
  "medicamentos"          JSONB NOT NULL DEFAULT '[]',
  -- [{ sustancia, codigo?, categoria, criticidad }]
  "alergias"              JSONB NOT NULL DEFAULT '[]',
  -- [{ codigo?, descripcion }]
  "factores_riesgo"       JSONB NOT NULL DEFAULT '[]',
  -- { dias, fechaInicio, origen: 'comun'|'laboral'|'transito', tipo? } | NULL
  "incapacidad"           JSONB,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rda_consultas_co_pkey" PRIMARY KEY ("medical_record_id")
);
CREATE INDEX "rda_consultas_co_clinic_id_patient_id_idx" ON "rda_consultas_co"("clinic_id", "patient_id");
ALTER TABLE "rda_consultas_co" ADD CONSTRAINT "rda_consultas_co_medical_record_id_fkey"
  FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rda_consultas_co" ADD CONSTRAINT "rda_consultas_co_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rda_consultas_co" ADD CONSTRAINT "rda_consultas_co_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
