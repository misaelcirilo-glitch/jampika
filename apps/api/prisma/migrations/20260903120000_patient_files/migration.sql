-- Archivos del paciente (fotos, RX, analíticas). Binario en Vercel Blob; aquí metadatos.

-- CreateTable
CREATE TABLE "patient_files" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "uploaded_by" UUID,
    "category" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_files_patient_id_idx" ON "patient_files"("patient_id");

-- CreateIndex
CREATE INDEX "patient_files_clinic_id_idx" ON "patient_files"("clinic_id");

-- AddForeignKey
ALTER TABLE "patient_files" ADD CONSTRAINT "patient_files_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_files" ADD CONSTRAINT "patient_files_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
