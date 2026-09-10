# PRP-014 (Jampika) — WhatsApp multi-tenant + Chat clínica↔paciente (add-on de pago)

> Estado: **EN CURSO** · Fecha: 2026-09-10 · Autor: Claude Code.

## 1. Objetivo
Que cada clínica converse con sus pacientes por **su propio número de WhatsApp** (modelo Verioska), con un **inbox dentro de Jampika**. Es un **add-on de pago (upsell)** aparte del plan. Se construye YA (software completo, demoable en modo simulado); conectar el número real de cada clínica es un paso de onboarding por cliente.

## 2. Empaquetado / cobro (decisión Misael 2026-09-10)
Dos add-ons independientes, gateados por `enabledModules` y facturados como **subscription items extra** en Stripe (PRP-012):
- **`recordatorios`** — avisos de cita (ya implementado, PRP-013). Barato de operar.
- **`chat`** — conversación bidireccional clínica↔paciente (este PRP). Premium (número por tenant, más coste).
Un Consultorio ($29) + add-on chat ($X) = $29+$X. Activar add-on ⇒ `enabledModules += 'chat'`; cancelar ⇒ se apaga.

## 3. Contexto real (reutilizar)
- Multi-tenant `clinics`/`clinicId`; API Express `/api/v1/*`; Prisma+Neon; web Next offline-first.
- **Outbound ya per-tenant-ready** (PRP-013): `sendAppointmentReminder(msg, config?)` lee `settings.whatsapp = { phoneId, template, token?, lang? }` con fallback a env compartido. El **token System User** de Misael (compartido) cubre los números de todos los tenants; cada clínica aporta su `phoneId` + plantilla.
- Patrón webhook Meta (verify token, firma, routing por `phone_number_id`) ya usado en Verioska Agent / Dental → replicar.

## 4. Diseño
### 4.1 Config por tenant
`clinics.settings.whatsapp = { phoneId, template?, lang?, token? }`. `phoneId` identifica al tenant en el inbound.

### 4.2 Datos — migración `add_whatsapp_chat`
- `whatsapp_conversations`: id, clinicId, patientId?(nullable), phone, lastMessageAt, lastMessagePreview, unreadCount, status(open|closed), createdAt. Índice (clinicId, lastMessageAt), unique (clinicId, phone).
- `whatsapp_messages`: id, conversationId, clinicId, direction(in|out), type(text|template|button|image|...), body, waMessageId?, status?(sent|delivered|read|failed), createdAt. Índice (conversationId, createdAt).

### 4.3 Webhook inbound — `apps/api/src/modules/whatsapp/webhook.routes.ts`
- `GET /api/v1/whatsapp/webhook`: verificación Meta (`hub.mode=subscribe`, `hub.verify_token`==`WHATSAPP_VERIFY_TOKEN` ⇒ responde `hub.challenge`).
- `POST /api/v1/whatsapp/webhook`: (valida firma `X-Hub-Signature-256` con `WHATSAPP_APP_SECRET` si está) → por cada mensaje: `phone_number_id` → clínica (match `settings.whatsapp.phoneId`) → upsert conversación (por phone) + insert message(in) + intenta ligar `patientId` por teléfono. Botones (confirmar/cancelar cita) → actualiza `appointments.status` correlacionando por contexto. montado ANTES de auth (público) — como el webhook de Stripe.

### 4.4 Chat API (gated `chat`) — `apps/api/src/modules/whatsapp/chat.routes.ts` (authMiddleware + gate módulo)
- `GET /conversations` (tenant-scoped, orden por lastMessageAt).
- `GET /conversations/:id/messages`.
- `POST /conversations/:id/messages` (enviar): dentro de ventana 24h ⇒ texto libre (Cloud API `type:text`); fuera ⇒ exige template. Persiste message(out). Reusa proveedor (extender `whatsapp.ts` con `sendText`).
- Marca leído (`unreadCount=0`).

### 4.5 Web — inbox (gated `chat`)
- `/(dashboard)/chat`: lista de conversaciones + hilo + responder. Ítem en Sidebar solo si `hasModule(clinic,'chat')`. Badge de no leídos.

### 4.6 Gating / activación
- `professions.ts`/`modules`: `chat` y `recordatorios` son **add-ons** (no vienen en presets de profesión). Se añaden a `enabledModules` al contratar el add-on. Toggle temporal (admin/plataforma) hasta que PRP-012 los cobre como subscription item.

## 5. Credenciales / onboarding por cliente
Compartidos (env jampika-api): `WHATSAPP_TOKEN` (System User), `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`. Por clínica (settings): `phoneId` + plantilla aprobada. Sin credenciales ⇒ **modo simulado** (endpoints funcionan, envíos se loguean; inbound se puede simular con un POST de prueba) ⇒ **demoable ya**.

## 6. Fases (bucle-agéntico)
- **F1** — migración (conversations+messages) validada en STAGING → prod.
- **F2** — webhook inbound (verify + receive + routing por phone_number_id + store) + `sendText` en proveedor.
- **F3** — chat API (list/thread/send, ventana 24h, gate módulo).
- **F4** — web inbox + sidebar gateado.
- **F5** — activación del módulo (toggle) + seed de conversación demo + verificación E2E (simulado). Cobro real = PRP-012.

## 7. Criterio de éxito
1. Webhook verify responde challenge; POST de prueba con un `phone_number_id` de una clínica crea conversación+mensaje ligado a esa clínica (aislado de otras).
2. Inbox lista conversaciones del tenant, abre hilo, envía respuesta (simulada si no hay creds) y persiste.
3. Módulo `chat` gatea inbox y sidebar; clínica sin add-on no lo ve.
4. Aislamiento multi-tenant garantizado; sin regresión; typecheck limpio.

## 8. Seguridad / auto-blindaje
- Webhook público pero con **verify token** + **firma**; routing estricto por `phone_number_id`→clínica (nunca cruzar tenants).
- Enviar fuera de ventana 24h **exige template** (regla WhatsApp).
- Aislar SIEMPRE por `clinicId` en chat API.

## 9. Fuera de alcance
Cobro real del add-on (PRP-012/Stripe), bot/IA de respuestas automáticas, multimedia avanzada, aprovisionamiento automático de números (es onboarding manual por clínica).
