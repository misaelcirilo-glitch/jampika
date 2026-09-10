-- Cuestionarios/tareas del paciente (PRP-017): asignaciones + respuestas.

CREATE TABLE "questionnaire_assignments" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "assigned_by" UUID,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'scale',
    "template_key" TEXT,
    "questions" JSONB NOT NULL DEFAULT '[]',
    "answers" JSONB,
    "score" INTEGER,
    "interpretation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "questionnaire_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "questionnaire_assignments_clinic_id_patient_id_created_at_idx" ON "questionnaire_assignments"("clinic_id", "patient_id", "created_at");

ALTER TABLE "questionnaire_assignments" ADD CONSTRAINT "questionnaire_assignments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "questionnaire_assignments" ADD CONSTRAINT "questionnaire_assignments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
