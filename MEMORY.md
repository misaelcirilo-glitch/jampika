# Memoria del Proyecto - Jampika

## Proyecto
- **Nombre**: Jampika - SaaS offline-first para clínicas médicas
- **Ruta**: `c:\Desarrollador\jampika`
- **Mercado**: Perú, Colombia, Ecuador, Bolivia, México, Chile
- **Diferenciador**: Funciona 100% offline, sincroniza automáticamente

## Stack
- Monorepo: Turborepo + npm workspaces
- Frontend: Next.js 15 + React 18 + TS + Tailwind + Zustand + Dexie (IndexedDB)
- Backend: Node 20 + Express + Prisma + PostgreSQL 16
- Auth: JWT + refresh tokens (30 días para soportar offline largo)
- Sync: Cola local + push/pull + last-write-wins (medical_records es append-only)

## Estado (2026-04-11)
- **PRP-001 Setup monorepo**: COMPLETADO (Turborepo, TS, docker-compose, .env)
- **PRP-002 Schema Prisma + seeds**: COMPLETADO (11 modelos, seed con clínica+usuarios+paciente+cita demo)
- **PRP-003 Backend auth**: COMPLETADO (login/refresh/logout/register-clinic, JWT middleware, requireRole)
- **PRP-004 Módulos CRUD**: COMPLETADO (patients, appointments, records, billing, inventory, dashboard)
- **PRP-005 Sync engine backend**: COMPLETADO (push/pull + conflict-resolver + sync_log)
- **PRP-006 Frontend PWA shell**: COMPLETADO (Next.js App Router, layout, Sidebar, SyncBadge, login)
- **PRP-007 DB local + sync cliente**: COMPLETADO (Dexie schema, queue, engine con backoff exponencial)
- **PRP-008 Módulos UI**: COMPLETADO (dashboard, patients, appointments, records SOAP, billing, inventory)
- **PRP-009 README + cierre**: COMPLETADO

## Credenciales demo
- admin@jampika.dev / jampika123
- doctor@jampika.dev / jampika123
- recepcion@jampika.dev / jampika123

## Arquitectura clave
- **Offline-first**: todas las mutaciones escriben primero en Dexie y encolan en `sync_queue`. Lecturas siempre desde DB local.
- **IDs**: UUIDs generados en el cliente (nunca autoincrement) para evitar colisiones entre dispositivos.
- **Multi-tenant**: cada query filtra por `clinicId` (extraído del JWT). RLS de Postgres preparado en schema.
- **Sync bidireccional**:
  - Push: `/api/v1/sync/push` con `{deviceId, changes[]}`
  - Pull: `/api/v1/sync/pull?since=ISO&tables=a,b,c`
  - Backoff: 5s → 15s → 45s → 2m → 5m
- **Append-only**: `medical_records` nunca se actualiza, solo se agregan entradas (auditoría médica).

## Patrones establecidos
- API routes: `authMiddleware` primero, validación Zod, filtro por `req.auth!.clinicId`
- Servicios cliente en `src/features/[modulo]/[modulo].service.ts` con pattern: escribir Dexie → enqueue
- Tipos compartidos en `@jampika/shared` (importados tanto en api como en web)
- UUIDs: `uuid.v4()` en cliente, `randomUUID()` en backend
- Next.js 15: `params` es `Promise<{}>`, usar `use(params)` en client components

## Archivos críticos
- Sync engine cliente: `apps/web/src/lib/sync/engine.ts`
- Sync service backend: `apps/api/src/modules/sync/sync.service.ts`
- Conflict resolver: `apps/api/src/modules/sync/conflict-resolver.ts`
- Schema Prisma: `apps/api/prisma/schema.prisma`
- DB local Dexie: `apps/web/src/lib/db/schema.ts`
- Config multi-país: `packages/shared/src/constants/countries.ts`

## Despliegue en producción (2026-07-07) ✅
Arquitectura: **web y API como DOS proyectos Vercel separados + Neon Postgres**.
- **Web** (`jampika-production`, prj_17pWICu2i2MDH0Ew7eWKMqn9Uidj): Next.js en `jampika.com` + `jampika-production.vercel.app`. Build vía turbo desde la raíz (root `vercel.json`).
  - **Clave**: `NEXT_PUBLIC_API_URL=https://jampika-api.vercel.app/api/v1` en env de Vercel (sin esto el front pega a `localhost:4000` → "Load failed"). Es build-time: re-desplegar al cambiarla.
- **API** (`jampika-api`, prj_si72yaHRWxu1IhTEOFgEt5aorIVF): Express serverless en `jampika-api.vercel.app`. Root Directory = `apps/api`. Deploy con CLI desde la RAÍZ del repo con el link temporal a jampika-api (rootDir apps/api dobla la ruta si se despliega desde apps/api).
  - Entry: `apps/api/api/index.mjs` → `../dist/index.js`; `src/index.ts` exporta `app` y solo hace `listen` si `VERCEL!=='1'`.
  - **CORS_ORIGIN** (env API) debe incluir el origen del front: `https://jampika.com,https://www.jampika.com,...`.
  - Las URLs inmutables de deploy están protegidas por Vercel Auth; el **dominio de producción `jampika-api.vercel.app` es público** (usar ese).
- **BD**: Neon `jampika-production` (red-mountain-93957294), DB `neondb`, pooled. Ya migrada + seed (admin/doctor/recepcion@jampika.dev / jampika123).

### Auto-Blindaje del deploy (errores que costaron iteraciones)
1. **tsconfig `extends: ../../tsconfig.base.json`** rompe el build serverless (root aislado en apps/api → TS5083 "Cannot read tsconfig.base.json" → tsc cae a ES3 → 20 errores falsos de Prisma/vitest). Fix: tsconfig de apps/api **autocontenido** (sin extends).
2. **`@jampika/shared` (workspace `*`, no publicado)** rompe `npm install` del deploy aislado. Fix: se copiaron los tipos sync a `apps/api/src/types/sync.ts` y se quitó la dep.
3. **`rootDir: "."`** emitía `dist/src/index.js` pero el entry esperaba `dist/index.js`. Fix: `rootDir: "src"`.
4. **Prisma en Vercel**: `binaryTargets = ["native","rhel-openssl-3.0.x"]` obligatorio o el motor de query no se incluye.
5. Casts `as Prisma.*UncheckedCreateInput` en creates (clinicId escalar) por si la inferencia se endurece.

## Pendientes / Roadmap
- (Opcional) dominio propio `api.jampika.com` para el API (hoy `jampika-api.vercel.app`).
- Instalar dependencias: `npm install` desde la raíz
- Ejecutar `prisma generate` + `prisma migrate dev --name init` + `npm run db:seed`
- RLS: hay schema preparado pero falta activar con `SET app.current_clinic_id` en middleware
- Facturación electrónica SUNAT/DIAN
- Service Worker con Workbox (ahora hay uno básico en public/sw.js)
- Tests E2E del flujo offline → online
- Recordatorios WhatsApp (BullMQ + Redis ya disponible)

## Errores conocidos (Auto-Blindaje)
- Prisma `expiresIn` espera `StringValue | number`, castear `as any` al pasar desde env
- Next.js 15 + rutas con `(group)`: layouts anidados se aplican solo dentro del grupo
- Dexie requiere schema incremental (`version(N).stores({...})`) para migraciones
- Zod v3: usar `error.issues` en el handler (preparado para v4)
- `@jampika/shared` debe ir en `transpilePackages` de Next config
- Service Worker sólo registra en HTTPS o localhost
