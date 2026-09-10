# PRP-015 (Jampika) — Reserva online (self-scheduling) — add-on `reservas`

> Estado: **EN CURSO** · Fecha: 2026-09-10 · Autor: Claude Code.

## 1. Objetivo
Enlace público por clínica donde el **paciente reserva su cita solo** (elige día y hora libre, deja nombre+teléfono). Reduce trabajo administrativo. **Add-on de pago** (módulo `reservas`), como recordatorios y chat.

## 2. Contexto (reutilizar, sin migración)
- `clinics.slug` único → URL pública `jampika.com/reservar/<slug>`.
- `appointments` (startTime/endTime/status/doctorId) + `patients` (firstName/lastName/phone) ya existen. La cita creada **sincroniza sola** al Dexie de la clínica (pull normal).
- Rutas web: grupos `(auth)`/`(dashboard)` (con guard). La página pública va **fuera**, en `app/reservar/[slug]` (solo root layout, sin auth).
- Gate de add-ons: `settings.enabledModules` + middleware `requireModule` (ya creado).

## 3. Diseño
### 3.1 Config por clínica
`clinics.settings.booking = { enabled: boolean, doctorId?: string, weekdays: number[] (0=Dom..6=Sáb), startHour: number, endHour: number, slotMinutes: number, leadHours?: number }`. Zona = `clinic.timezone`.

### 3.2 API pública (sin auth) — `apps/api/src/modules/booking/` montado en `/api/v1/public/booking`
- `GET /:slug` → `{ clinicName, enabled, slotMinutes }` (enabled=false si el módulo `reservas` no está o `booking.enabled` es false).
- `GET /:slug/availability?from=YYYY-MM-DD&days=N` → `[{ date, times: ["09:00", ...] }]`: genera slots por weekday/hora/slot, **excluye ocupados** (citas que solapan del `doctorId`) y **pasados/lead**. Horas en zona de la clínica.
- `POST /:slug` `{ name, phone, date, time }` → revalida slot libre → **crea/enlaza paciente** por teléfono (últimos 9 dígitos) → crea `appointment` (doctorId de config o owner; `startTime` = local clínica→UTC; `endTime` = +slot; status `scheduled`; `appointmentType='reserva-online'`) → `{ ok, when }`. Doble-reserva evitada por re-chequeo.
- Helper tz: convierte fecha+hora local de la clínica a UTC (offset vía Intl; zonas LATAM sin DST).

### 3.3 Web pública — `app/reservar/[slug]/page.tsx` (client, sin dashboard)
Carga info → selector de día (próximos N) → horas libres → formulario (nombre, teléfono) → confirmar → pantalla "Reserva confirmada". Estados: módulo off/clinica no encontrada → mensaje amable.

### 3.4 Settings tab "Reservas" (gated `reservas`)
Enable + weekdays + startHour/endHour + slotMinutes + profesional; muestra el **enlace público** para copiar. Guarda en `settings.booking` (fusiona settings, reenvía campos como RemindersTab).

## 4. Fases
- **F1** — API pública (info/availability/create) + helper tz.
- **F2** — página pública `/reservar/[slug]`.
- **F3** — settings tab "Reservas" + gate + módulo.
- **F4** — deploy + E2E (habilitar en demo, reservar un slot, ver la cita creada).

## 5. Criterio de éxito
1. `/reservar/<slug>` de una clínica con `reservas` on muestra días/horas libres; sin el módulo → "no disponible".
2. Reservar crea la cita (visible en la agenda de la clínica) y enlaza/crea paciente; el slot deja de ofrecerse (no doble-reserva).
3. Aislado por clínica; sin auth en lo público; sin migración; typecheck limpio.

## 6. Seguridad / auto-blindaje
- Endpoints públicos **solo lectura de disponibilidad + creación de cita**; nunca exponen datos de otros pacientes. Rate-limit ligero (anti-spam) + validación Zod.
- Revalidar slot en el POST (evitar doble reserva por carrera).
- Gate `reservas` en la config; si off, público responde no disponible.

## 7. Fuera de alcance (futuro)
Derivar disponibilidad del `schedule` por-doctor; pago anticipado de la reserva; confirmación por WhatsApp (se integra con PRP-014); reprogramación/cancelación por el paciente; múltiples profesionales seleccionables.
