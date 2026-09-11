# PRP-012: Suscripción de plataforma (Stripe, piloto)

> **ACTUALIZACIÓN 2026-09-01 (handoff de Misael) — Fase 1 IMPLEMENTADA** en rama
> `stripe-subscription` (commit `86e94c3`), typecheck estricto OK, migración validada
> en branch Neon `staging-stripe`. Decisiones que **corrigen** el borrador de abajo:
> - Planes: **Consultorio / Clínica / Institución** (no hasta5/hasta15/mas15). USD,
>   monthly/yearly. Precios YA creados en Stripe test. lookup_keys `jampika_<plan>_<monthly|yearly>`.
> - Datos: tablas **Prisma `Subscription` + `StripeEvent`** (idempotencia), con `clinicId`
>   (NO columnas en `clinics`, NO `org_id`, NO SQL crudo).
> - Rutas en la **API Express** `/api/v1/stripe/{checkout,portal,subscription}` + webhook.
> - Checkout: **trial 30d**, `payment_method_collection:'always'`, `missing_payment_method:'pause'`,
>   `allow_promotion_codes`, 409+portal si ya hay sub activa.
> - Webhook `/api/v1/stripe/webhook` (raw body) con idempotencia y eventos
>   checkout.session.completed / subscription.* / invoice.paid / invoice.payment_failed / trial_will_end.
> - Capa fina `PaymentProvider` (los **webhooks NO se abstraen**); Rebill futuro con su handler.
> - Gate `assertCanAddProfessional` en `POST /settings/users` (doctor/nurse).
> - **Pendiente**: probar con `stripe listen` + 4242 (claves de Misael); Fase 2 = modo
>   solo-lectura por impago (respetando offline-first: nunca rechazar el sync de datos ya
>   escritos ni bloquear lectura clínica); Fase 3 = UI web.


> **Estado**: 📋 PLANTEADO (2026-08-30) — sin implementar. Documento de plan.
> **Fecha**: 2026-08-30
> **Proyecto**: Jampika (SaaS clínicas offline-first)
> **Alcance de cobro**: la **clínica paga por usar Jampika** (suscripción de plataforma). NO confundir con PRP-010 (facturación electrónica AL PACIENTE, SUNAT).

---

## Objetivo
Cobrar la suscripción de plataforma a cada clínica vía **Stripe** (cuenta de España, EMCIVI SERVICES SL), resolviendo precios por **lookup_key**, con **diseño agnóstico del proveedor** para añadir un rail local (dLocal) en el futuro sin reescribir.

## Por qué / contexto de la decisión (2026-08-30)
- Jampika hoy tiene un campo `clinics.plan` (default `starter`) **sin cobro real**. Fase de distribución → hay que monetizar.
- **Stripe en LATAM (investigado)**: no es merchant en PE/CO/EC, pero la cuenta **de España sí puede** crear suscripciones y cobrar **tarjeta internacional** de clientes LATAM. Limitación: la tarjeta internacional **no basta** en LATAM (faltan PSE/Yape/transferencia/efectivo) → conversión limitada.
- **Decisión (2026-08-30)**: **doble vía** → **Stripe (España) para el piloto YA** (validar precio con clínicas con tarjeta internacional) **+ Rebill en paralelo** como rail local MoR (métodos locales sin entidad local). Por eso la integración es **agnóstica del proveedor** (`PaymentProvider`): `StripeProvider` primero, `RebillProvider` después, sin reescribir.
- **Por qué Rebill como MoR local** (investigado 2026-08-30): es MoR LATAM-native (vertical healthtech) y **sí trae los métodos locales** — CO: PSE, Nequi · PE: Yape, PagoEfectivo, efectivo, tarjeta nacional · recurrente e installments — **sin necesidad de entidad local** (el MoR es el vendedor legal). Alternativas descartadas para este objetivo: **Paddle** (MoR sólido en impuestos/tarjeta global, pero no confirma Yape/PSE) y **Lemon Squeezy** (solo tarjeta + PayPal).
- **A confirmar con Rebill antes de casarnos**: MoR completo (remesa de impuestos), comisiones por país/método, payouts, cobertura de **Ecuador**, tiempo de onboarding/aprobación.
- **Nota cross-proyecto**: MyVipers tiene la misma exposición (precios `latam`/`pen` en Stripe llegan solo a tarjeta internacional) → mismo patrón Stripe-piloto + Rebill aplica allí.

---

## Precios (decididos 2026-08-30) — por clínica, USD, todo incluido
3 tramos por tamaño de clínica · anual = 2 meses gratis. Resolver por **lookup_key** (no por ID).

| Tramo | Mensual | Anual | lookup_key mensual / anual |
|---|---|---|---|
| Hasta 5 prof. | $29 | $290 | `jampika_hasta5_mensual` / `jampika_hasta5_anual` |
| Hasta 15 prof. | $59 | $590 | `jampika_hasta15_mensual` / `jampika_hasta15_anual` |
| Más de 15 | $99 | $990 | `jampika_mas15_mensual` / `jampika_mas15_anual` |

Referencia de mercado (PE/CO/EC): entrada ~$25–30/mes en soluciones con facturación electrónica; competencia mayoritariamente **por profesional** → nuestro **por clínica (plano)** es diferenciador. (Ver búsqueda 2026-08-30.)

**Paso previo del usuario**: crear en el panel de Stripe **3 productos × 2 precios = 6 precios** con esos lookup_keys, + pegar `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`.

---

## Estado actual (mapear en código)
- **Sin Stripe** en el código (el `billing` existente es facturación al paciente SUNAT — no tocar).
- `clinics` ya tiene: `plan`, `country`, `settings` (jsonb), `timezone`.
- Auth JWT propio con `clinicId` en el token (multi-tenant).

## Modelo de datos (migración nueva)
Añadir a `clinics` (aditivo, nullable):
- `stripe_customer_id`, `stripe_subscription_id`
- `subscription_status` (active/past_due/canceled…)
- `subscription_tier` (`hasta5` | `hasta15` | `mas15`)
- `plan_lookup_key`
- `subscription_current_period_end`

## Diseño agnóstico del proveedor (clave)
Interfaz `PaymentProvider` (espejo de `EmisorComprobante` del PRP-010):
```ts
interface PaymentProvider {
  createCheckout(clinicId, lookupKey): Promise<{ url: string }>;
  handleWebhook(rawBody, signature): Promise<void>;
  openBillingPortal(clinicId): Promise<{ url: string }>;
}
```
- Hoy: `StripeProvider`. Mañana: `DLocalProvider` (métodos locales + recurrente) sin tocar el resto.

---

## Fases
### Fase 0 — Precios + credenciales (usuario)
Crear los 6 precios en Stripe con sus lookup_keys; pegar `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (test primero) en la API (Vercel + local).

### Fase 1 — Integración Stripe (API)
- `stripe` + `getStripe()` diferido; `StripeProvider`.
- `POST /billing/subscription/checkout`: valida rol (owner/admin de la clínica) + `{ tier, periodo }` → arma lookup_key `jampika_{tier}_{periodo}` → `prices.list({lookup_keys})` → crea/reutiliza customer (en `clinics`) → `checkout.sessions.create` (mode subscription, metadata clinic_id + tier).
- `POST /billing/subscription/webhook`: firma verificada + cuerpo crudo → `customer.subscription.*` actualiza `clinics` (status, tier, lookup_key, period_end).
- `POST /billing/subscription/portal`: `billingPortal` para gestionar/cancelar.

### Fase 2 — Enforcement del tramo
- Contar **profesionales activos** de la clínica; al superar el límite del tramo (5/15), avisar y ofrecer upgrade (checkout del tramo mayor). Regla en el config del tramo.

### Fase 3 — UI de suscripción (web)
- Pantalla "Plan/Suscripción" en el panel: elegir tramo + periodo → checkout; ver estado (activo/vencido/período); botón "Gestionar pago" (portal).
- Banner si `subscription_status` no activo (trial/gracia por definir).

### Fase 4 — Verificación
- Checkout en **test mode** end-to-end → webhook activa plan+tramo en `clinics`.
- Aislamiento por `clinic_id`. Nota offline: suscripción es acción **online** (aceptable; no requiere offline-first).

---

## Fuera de alcance (fases/PRP futuros)
- **Rail local LATAM = Rebill (MoR)** para PSE/Yape/PagoEfectivo/transferencia + recurrente → se enchufa por `PaymentProvider` como `RebillProvider` (fase posterior, en paralelo al alta comercial de Rebill que hace Misael). El piloto Stripe solo llega a tarjeta internacional.
- Impuestos (Stripe Tax) si se requiere factura por la suscripción.
- Precios en moneda local por país (hoy todo USD).

## Riesgos y mitigación
| Riesgo | Mitigación |
|---|---|
| Conversión baja en LATAM (solo tarjeta internacional) | Asumido en el piloto; `PaymentProvider` deja listo el rail local (dLocal) |
| Romper la facturación al paciente (SUNAT) | Módulo separado; esta suscripción es otro flujo (`/billing/subscription/*`) |
| Enforcement de tramo mal contado | Contar solo profesionales activos; avisar antes de bloquear |
| Multi-tenant | Todo por `clinic_id`; customer/suscripción por clínica |

## Criterios de aceptación
- Una clínica puede suscribirse (tramo + periodo) y su estado/tramo queda en `clinics` vía webhook.
- Precios resueltos por lookup_key (cambiar importes en Stripe no toca código).
- Diseño agnóstico: añadir dLocal = nuevo `PaymentProvider`, sin reescribir checkout/webhook/UI.
- No afecta la facturación SUNAT al paciente.

---

*PRP planteado 2026-08-30. Decisiones cerradas: 3 tramos ($29/$59/$99), USD, mensual+anual, Stripe (España) piloto, dLocal futuro, cobro por lookup_key. Pendiente: crear precios en Stripe + implementar.*
