-- Consultora Senior: chat de consultoría de gestión clínica (historial por clínica+usuario).

CREATE TABLE "consultora_mensajes" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rol" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consultora_mensajes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consultora_mensajes_clinic_id_user_id_created_at_idx" ON "consultora_mensajes"("clinic_id", "user_id", "created_at");
