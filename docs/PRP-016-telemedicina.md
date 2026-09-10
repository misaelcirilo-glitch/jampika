# PRP-016 (Jampika) — Telemedicina / videoconsulta (add-on `telemedicina`)

> Estado: **HECHO** · Fecha: 2026-09-10 · Autor: Claude Code.

## 1. Objetivo
Videoconsulta entre profesional y paciente ligada a una cita. **Add-on de pago** (módulo `telemedicina`). Demoable ya con **Jitsi** (`meet.jit.si`, sin API key); onboarding por cliente = solo activar el add-on.

## 2. Diseño (sin migración)
- **Sala** = `jampika-<appointmentId>` (UUID → no adivinable). URL = `https://meet.jit.si/<room>`.
- **Token** del paciente = HMAC(appointmentId, `VIDEO_SECRET`) → enlace `${APP_URL}/consulta/<appointmentId>?t=<token>`.
- **API** `apps/api/src/modules/telemedicine/`:
  - Profesional (auth + `requireModule('telemedicina')`): `GET /api/v1/appointments/:id/video` → `{ roomUrl, patientJoinUrl }` (tenant-scoped).
  - Paciente (público): `GET /api/v1/public/video/:id?t=` → valida token + módulo activo → `{ roomUrl, clinicName, when }`.
- **Web**:
  - Profesional: botón **📹 Videollamada** en el modal de la cita (agenda) — abre la sala + copia el enlace del paciente. Gateado por `hasModule('telemedicina')`.
  - Paciente: `app/consulta/[id]/page.tsx` (público) → "Entrar a la consulta" → **embed Jitsi** (iframe con permiso cámara/micro) + fallback link.
- **Gate add-on**: profesional por `requireModule`; público valida el módulo en `getPublic`.

## 3. Credenciales (opcional, para producción propia)
`VIDEO_SECRET` (firmar tokens; si falta usa uno dev), `APP_URL` (base de los enlaces, default jampika.com). Jitsi público no requiere claves. Futuro: Jitsi self-hosted / Daily / Twilio para SLA y JWT-rooms.

## 4. Criterio de éxito
1. Clínica con `telemedicina`: el modal de cita muestra 📹 y `GET /:id/video` devuelve sala + enlace paciente.
2. `GET /public/video/:id?t=` con token correcto → datos de sala; token malo → 404.
3. `/consulta/:id?t=` abre la videollamada (Jitsi). Sin el módulo → no disponible.
4. Sin migración; typecheck limpio; aislado por clínica.

## 5. Fuera de alcance
Grabación, sala JWT/privada (self-host), sala de espera, notificar al paciente el enlace por WhatsApp (se integra con PRP-014), múltiples participantes.
