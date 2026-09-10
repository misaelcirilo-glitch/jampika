# PRP-013 (Jampika) — Recordatorios de cita por WhatsApp

> Estado: **PROPUESTO/EN CURSO** · Fecha: 2026-09-10 · Autor: Claude Code.

## 1. Objetivo
Reducir el **no-show** enviando un **recordatorio automático por WhatsApp** al paciente/consultante antes de su cita. Módulo **opcional cobrable** (upsell), activable por clínica. Transversal a todas las profesiones.

## 2. Contexto real (ya existe — no reinventar)
- `appointments` YA tiene `reminderSent Boolean` + `reminderSentAt DateTime?` (idempotencia) + `startTime`, `status`, `clinicId`, `patientId`. `patients.phone String?`. `clinics.settings Json`. → **SIN MIGRACIÓN**.
- API Express serverless (`apps/api`), rutas `/api/v1/*`, Prisma+Neon. Web offline-first (Dexie).
- Ya hay know-how de **WhatsApp Cloud API** en otros proyectos del usuario (Verioska Agent / Dental) → reutilizar patrón.

## 3. Decisiones de diseño
- **Número remitente**: **uno compartido de Jampika** (Cloud API) para el MVP; el mensaje personaliza clínica + paciente + fecha/hora. (Per-clínica = fase futura.)
- **Cuándo**: un recordatorio por cita, **N horas antes** (config, default **24h**). Idempotente por `reminderSent`.
- **Proveedor abstracto** estilo `EmisorSimulado`: si NO hay credenciales WhatsApp → **modo simulado** (log, no envía) → todo es construible/desplegable YA; el envío real se enciende al poner las credenciales. Sin `any`.
- **Config por clínica** en `clinics.settings.reminders = { enabled: boolean, hoursBefore: number }`. Gate del módulo por `enabledModules` incluye `'recordatorios'` (upsell) — para el MVP basta `settings.reminders.enabled`.
- **Scheduler**: **Vercel Cron** llama a un endpoint protegido cada ~30 min (serverless no tiene cron en proceso).

## 4. Alcance / Fases
- **F0** — módulo `'recordatorios'` + tipo de config `reminders` en settings (helper de lectura).
- **F1** — proveedor `apps/api/src/modules/reminders/whatsapp.ts`: `sendAppointmentReminder(...)` (real Cloud API vía template + fallback **simulado** si faltan `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_ID`/`WHATSAPP_TEMPLATE`). Sin `any`.
- **F2** — servicio + endpoint `apps/api/src/modules/reminders/`: `POST /api/v1/reminders/run` protegido por `x-cron-secret` = `CRON_SECRET`. Selecciona citas `status='scheduled'`, `startTime` en `(now, now+hoursBefore]`, `reminderSent=false`, `patient.phone` no nulo, clínica con `reminders.enabled`. Envía → marca `reminderSent=true`,`reminderSentAt=now`. Devuelve `{ processed, sent, skipped }`. Idempotente.
- **F3** — **Vercel Cron** en `apps/api/vercel.json` (`crons: [{ path:'/api/v1/reminders/run', schedule:'*/30 * * * *' }]`) + `CRON_SECRET` en env de jampika-api. (Vercel Cron incluye header propio; validamos secreto.)
- **F4** — Web: en **Configuración** un bloque "Recordatorios por WhatsApp" (toggle enabled + horas antes), gateado por el módulo. (Opcional: badge de estado en la lista de citas.)

## 5. Credenciales que aporta Misael (cuando quiera envío real)
`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` (phone number id de Cloud API), `WHATSAPP_TEMPLATE` (nombre de plantilla **aprobada** por Meta: recordatorio con variables nombre/clínica/fecha-hora), `CRON_SECRET`. Los pega en el panel de Vercel (jampika-api). Sin ellos → modo simulado.

## 6. Criterio de éxito
1. `POST /reminders/run` con secreto correcto procesa la ventana y responde conteo; sin secreto → 401.
2. Una cita dentro de la ventana con paciente con teléfono y clínica con `reminders.enabled` → se marca `reminderSent` (envío real si hay creds; simulado si no) y NO se reenvía (idempotente).
3. Clínicas sin `reminders.enabled` o sin teléfono → se saltan.
4. Cron configurado; typecheck limpio; sin regresión.

## 7. Auto-blindaje / seguridad
- Endpoint cron **protegido por secreto** (no público) — nunca dispara envíos sin autorización.
- **Idempotencia** por `reminderSent` (evita spam al paciente si el cron corre seguido).
- **Offline-first respetado**: es una capa online adicional; no toca el núcleo offline ni bloquea nada.
- WhatsApp exige **plantilla aprobada** para mensajes iniciados por el negocio (fuera de ventana 24h) → se usa template, no texto libre.

## 8. Fuera de alcance (futuro)
Número por clínica; segundo recordatorio (2h); confirmación/cancelación por respuesta del paciente; SMS fallback; recordatorios de tratamiento/medicación.
