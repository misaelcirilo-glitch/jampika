# PRP-017 (Jampika) — Cuestionarios y tareas para el paciente (módulo `cuestionarios`)

> Estado: **HECHO** · Fecha: 2026-09-10 · Autor: Claude Code.

## 1. Objetivo
Que el profesional (sobre todo psicólogo/terapeuta/coach — "en lugar de recetas") **envíe cuestionarios (escalas) o tareas** al paciente vía enlace; el paciente responde sin login; el profesional ve resultado y **puntuación** (escalas). Incluido en los verticales que no usan recetas (módulo `cuestionarios`, en presets de todas las profesiones).

## 2. Diseño (sin acoplar Clinic/Patient)
- **Escalas built-in** (`templates.ts`): **PHQ-9** (depresión) y **GAD-7** (ansiedad), Likert 0-3 + bandas interpretativas + `scoreScale`. **Tarea libre**: type='task', el profesional escribe el enunciado; el paciente responde texto.
- **Datos**: migración `20260910140000_questionnaires` (tabla `questionnaire_assignments`: clinicId, patientId, title, type, templateKey, questions(JSON snapshot), answers(JSON), score, interpretation, status, token, timestamps). Aplicada a prod. Modelo Prisma scalar-only.
- **API** `apps/api/src/modules/questionnaires/`:
  - Profesional (auth + `requireModule('cuestionarios')`, en `/api/v1/questionnaires`): `GET /templates`, `GET /patient/:id` (lista), `POST /patient/:id` (asigna escala o tarea → snapshot preguntas + token → devuelve `patientLink`).
  - Paciente (público, `/api/v1/public/questionnaire/:id?t=`): `GET` (título+preguntas+estado), `POST` (respuestas → si escala, puntúa → completado).
- **Web**: pestaña **Cuestionarios** en el detalle del paciente (`features/questionnaires/QuestionnairesTab.tsx`, gateada por `hasModule('cuestionarios')`) — asignar (escala/tarea) + copiar enlace + ver estado/puntuación. Página pública `app/formulario/[id]/page.tsx` — responder (radios Likert / texto) → gracias.
- **Enlace del paciente**: `${APP_URL}/formulario/<id>?t=<token>` (token aleatorio, no adivinable).

## 3. Criterio de éxito
1. Clínica con `cuestionarios`: pestaña visible; asignar PHQ-9/GAD-7/tarea → enlace.
2. Paciente abre enlace → responde → escala **puntuada** (score+banda) y visible para el profesional; token malo → 404.
3. Incluido por defecto en profesiones (nuevas altas psicólogo/terapeuta/coach lo traen). Sin regresión; typecheck limpio; aislado por clínica.

## 4. Fuera de alcance
Editor de plantillas custom (más allá de tarea libre), envío del enlace por WhatsApp (integra PRP-014), gráficas de evolución de puntuaciones, más escalas.
