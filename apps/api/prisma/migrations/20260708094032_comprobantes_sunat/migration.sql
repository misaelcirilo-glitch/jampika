-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "comprobante_estado" TEXT NOT NULL DEFAULT 'emitido',
ADD COLUMN     "correlativo" INTEGER,
ADD COLUMN     "receptor_tipo_doc" TEXT,
ADD COLUMN     "serie" VARCHAR(4),
ADD COLUMN     "sunat_hash" TEXT;

-- CreateTable
CREATE TABLE "comprobante_series" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "tipo_comprobante" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "correlativo" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comprobante_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comprobante_series_clinic_id_serie_key" ON "comprobante_series"("clinic_id", "serie");

-- AddForeignKey
ALTER TABLE "comprobante_series" ADD CONSTRAINT "comprobante_series_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
