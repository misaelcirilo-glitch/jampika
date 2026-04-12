# Jampika

SaaS offline-first para gestión de clínicas médicas pequeñas y medianas en Latinoamérica (Perú, Colombia, Ecuador, Bolivia, México, Chile).

## Características

- **Offline-first**: funciona sin internet, sincroniza cuando hay conexión.
- **Multi-tenant**: cada clínica aislada por `clinic_id`.
- **Multi-país**: configuración por país (impuestos, documentos, regulaciones).
- **Historia Clínica Electrónica**: formato SOAP, append-only.
- **Agenda, facturación, inventario** integrados.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 15 + React 18 + TypeScript + Tailwind + Zustand + Dexie (IndexedDB) |
| Backend | Node.js 20 + Express + TypeScript + Prisma |
| BD | PostgreSQL 16 (Docker / Neon) |
| Auth | JWT + refresh tokens |
| Sync | Cola local + push/pull con resolución de conflictos (last-write-wins) |
| Monorepo | Turborepo + npm workspaces |

## Estructura

```
jampika/
├── apps/
│   ├── api/            # Backend Express + Prisma
│   └── web/            # Frontend Next.js PWA
├── packages/
│   └── shared/         # Tipos y constantes compartidas
├── docker-compose.yml  # Postgres + Redis
├── turbo.json
└── package.json
```

## Puesta en marcha

### 1. Requisitos

- Node.js 20+
- Docker Desktop
- npm 10+

### 2. Instalación

```bash
cd c:/Desarrollador/jampika
npm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 3. Levantar Postgres + Redis

```bash
npm run db:up
```

### 4. Migraciones y seeds

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

### 5. Arrancar en dev

```bash
# desde la raíz
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:3000

### Credenciales demo

- admin@jampika.dev / jampika123
- doctor@jampika.dev / jampika123
- recepcion@jampika.dev / jampika123

## Sync engine

El motor de sincronización vive en:

- Cliente: [apps/web/src/lib/sync/engine.ts](apps/web/src/lib/sync/engine.ts) + [queue.ts](apps/web/src/lib/sync/queue.ts)
- Servidor: [apps/api/src/modules/sync/sync.service.ts](apps/api/src/modules/sync/sync.service.ts) + [conflict-resolver.ts](apps/api/src/modules/sync/conflict-resolver.ts)

Flujo:

1. Todas las mutaciones del cliente escriben primero en IndexedDB (Dexie) y encolan un `SyncQueueItem`.
2. Cuando hay conexión, `syncAll()` hace push de la cola al servidor.
3. Luego hace pull de cambios desde `last_sync` y los aplica a la DB local.
4. Conflictos: `medical_records` es append-only; el resto usa last-write-wins por `updatedAt`.
5. Reintentos con backoff exponencial: 5s → 15s → 45s → 2m → 5m.

## Módulos MVP

- [x] Autenticación multi-tenant (JWT + refresh)
- [x] Pacientes (CRUD + búsqueda)
- [x] Agenda de citas
- [x] Historia Clínica Electrónica (SOAP + signos vitales + CIE-10)
- [x] Facturación (boleta/factura, correlativos, reportes)
- [x] Inventario básico
- [x] Dashboard
- [x] Sync engine bidireccional
- [x] PWA (manifest + service worker)

## Roadmap

- [ ] Facturación electrónica SUNAT/DIAN
- [ ] Recordatorios WhatsApp
- [ ] Telemedicina integrada
- [ ] Reportes avanzados
- [ ] App móvil nativa
