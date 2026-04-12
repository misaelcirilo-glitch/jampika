-- CreateTable
CREATE TABLE "clinic_medications" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "generic" TEXT,
    "presentation" TEXT,
    "default_dosage" TEXT,
    "default_frequency" TEXT,
    "category" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_medications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinic_medications_clinic_id_name_idx" ON "clinic_medications"("clinic_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_medications_clinic_id_name_presentation_key" ON "clinic_medications"("clinic_id", "name", "presentation");

-- AddForeignKey
ALTER TABLE "clinic_medications" ADD CONSTRAINT "clinic_medications_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
