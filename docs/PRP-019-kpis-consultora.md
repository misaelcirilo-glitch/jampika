# PRP-019 — Módulo de Indicadores (KPIs) alineado con la Consultora Senior

> Estado: **COMPLETADO** (2026-10-01) — API + web + consultora; verificado en local con datos de prueba
> Referencia: módulo de KPIs de Verioska Dental Cloud (3 niveles, semáforos, "a quién pedírselo / qué hacer").

## Objetivo

Página **Indicadores** con tarjetas visuales que muestran exactamente los puntos que la Consultora Senior usa para diagnosticar y recomendar: ciclo de ingresos, capacidad/agenda (Lean), Patient Journey y Balanced Scorecard. Cada KPI trae **número + semáforo + referencia + responsable + acción recomendada**.

La **misma función de cálculo** alimenta la página y el prompt de la consultora → la consultora cita los mismos números que ve el usuario (sin duplicar fórmulas, a diferencia de Verioska).

## Adaptación desde Verioska (Jampika no tiene presupuestos ni gastos)

| Verioska Dental | Jampika (equivalente) |
|---|---|
| Pérdida de sillón | **Capacidad perdida** (horas de agenda no atendidas, desde `users.schedule`) |
| Aceptación de presupuestos | **Tasa de no-show** (la fuga #1 del ciclo de ingresos en clínica médica) |
| Pacientes que no vuelven (ppto. aceptado sin cita) | **Pacientes sin próxima cita** (atendidos en 6 meses, sin cita futura) |
| Margen por doctor (% colaborador) | **Tasa de cobro** (cobrado / facturado) + productividad por profesional en Nivel 3 |
| Embudo de presupuestos | **Embudo Patient Journey**: agendadas → asistidas → facturadas → cobradas → volvieron |
| Salud financiera 60-25-15 | **Regla 65-70%** de costes operativos (requiere configurar costes fijos) |
| Dependencia del propietario | Igual, usando `clinics.owner_id` |

## Contenido

**Filtros**: periodo (semana / mes / trimestre / año) + profesional. Comparativa con el periodo anterior (↑/↓).

### Nivel 1 — 4 esenciales (tarjetas grandes con semáforo)
1. **Capacidad perdida**: horas y % de la agenda disponible no atendidas (huecos + cancelaciones + no-shows). Muestra el monto perdido si hay coste/hora configurado. <10% verde · 10-20% ámbar · >20% rojo. A quién: Recepción.
2. **Tasa de no-show**: <5% verde · 5-10% ámbar · >10% rojo. A quién: Recepción. Qué hacer: confirmación 24h por WhatsApp + lista de espera.
3. **Pacientes sin próxima cita**: número + botón "Ver lista" con WhatsApp/llamar por paciente. A quién: Recepción. Qué hacer: seguimiento post-consulta (fase "Seguimiento" del Patient Journey).
4. **Tasa de cobro**: >95% verde · 90-95% ámbar · <90% rojo, más el monto pendiente y los días promedio de cobro. A quién: Administración.

### Nivel 2 — tarjetas de Balanced Scorecard (4 perspectivas)
- **Financiera**: ingresos cobrados (+ tendencia), ingreso por consulta, días promedio de cobro.
- **Paciente**: pacientes nuevos, tasa de retorno (pacientes con 2 o más consultas en 6 meses).
- **Procesos**: ocupación de agenda (meta 70-85%), consultas realizadas vs capacidad, cancelaciones %.
- **Recursos** (solo si el módulo de inventario está activo): insumos bajo stock + por vencer en 30 días.

### Nivel 3 — secciones desplegables
- **Embudo Patient Journey** (barras horizontales).
- **Productividad por profesional**: consultas, ingresos, ingreso/hora, ocupación (mini-barras).
- **Rentabilidad por servicio**: ingresos y unidades por servicio (desde las líneas de factura).
- **Salud financiera**: costes vs regla 65-70%. Si no hay costes configurados, se muestra un placeholder con un botón para configurarlos.
- **Dependencia del fundador**: % de ingresos generados por `owner_id` vs el resto (meta <40%).

### Configuración (sin migración)
En `clinics.settings.kpis` (JSON existente): `costoHoraConsulta` y `costosFijosMensuales`. Se editan desde la propia página (solo admin). **Cero migraciones de BD.**

## Archivos

**API** (`apps/api/src/modules/kpis/`)
- `kpis.service.ts`: `calcularSnapshotKpis(clinicId, { periodo, doctorId })`. Usa Prisma y agrega en servidor. Usa la zona horaria de la clínica.
- `kpis.routes.ts`: `GET /api/v1/kpis?periodo=&doctorId=` (admin/doctor) y `PUT /api/v1/kpis/config` (admin, Zod).
- `index.ts`: montar la ruta.
- `consultora.service.ts` + `consultora.prompt.ts`: reemplazar el `calcularKpis` reducido por el snapshot completo (mes en curso), con semáforos y guía de acción. El fallback sin IA usa las mismas alertas.

**Web**
- `src/app/(dashboard)/kpis/page.tsx` (página).
- `src/features/kpis/{kpis.service.ts, types.ts, components/*}`: `EssentialKpiCard`, `KpiCard`, `ExpandableSection`, `HBar` (barras en CSS, **sin librería de gráficos nueva**) y las secciones.
- `Sidebar.tsx`: ítem "Indicadores" (admin/doctor).
- Estilo shadcn/tokens existentes; terminología según profesión (`prof.patients`).

## Reglas / riesgos
- **Offline-first**: los KPIs son agregados del servidor y requieren conexión. Sin red se muestra un aviso, no un error. No se toca Dexie ni el sync.
- **Multi-tenant**: toda consulta filtra por `clinicId` del JWT. `doctorId` se valida contra la clínica.
- **Moneda**: según país (PEN/COP/USD/BOB/MXN/CLP).
- Facturas con `comprobanteEstado = 'anulado'` se excluyen.
- Sin `any`, Zod en inputs, archivos ≤500 líneas.

## Criterio de éxito
- `npm run typecheck` + build de API y web en verde.
- Con la demo (`admin@jampika.dev`), la página carga los 3 niveles con datos reales y filtros funcionales.
- La consultora responde citando el mismo número que la tarjeta (p. ej. no-show).
- Commit + push. Deploy: la API se despliega sola al hacer push; la web con `vercel --prod`.
