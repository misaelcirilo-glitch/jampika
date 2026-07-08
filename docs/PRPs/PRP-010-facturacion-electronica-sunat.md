# PRP-010: Facturación Electrónica SUNAT (Perú)

> **Estado**: EN PROGRESO — Fase 1 (fundación) implementada en local. Decisión de integración PENDIENTE del usuario.
> **Fecha**: 2026-07-08
> **Proyecto**: Jampika (SaaS clínicas offline-first)
> **Mercado de esta feature**: **Perú** (SUNAT). Otros países (CO=DIAN, EC=SRI, BO, MX, CL) quedan fuera de este PRP.

---

## Objetivo
Emitir **boletas y facturas electrónicas válidas ante SUNAT** desde el módulo de facturación, respetando la arquitectura multi-tenant (cada clínica emite con su propio RUC) y offline-first.

## Por qué
Hoy el módulo genera un número interno (`B-000001`) que **no es un comprobante SUNAT**. Sin comprobante electrónico válido, las clínicas peruanas no pueden operar legalmente. Es un bloqueador de adopción en el mercado principal (Perú).

---

## Estado actual (mapeado en código)
- `Invoice` ya tiene: `invoiceType` (boleta/factura/nota_venta), `customerTaxId`, `taxRate` (18% IGV), `currency` PEN, y campos **preparados y vacíos** `electronicInvoiceId/Status/Xml`.
- `Clinic` tiene `taxId` (RUC), `country`, `address`, `name`.
- `billing.routes.ts`: `POST /invoices` calcula subtotal/IGV/total y genera correlativo naíf `B-000001`. `POST /invoices/:id/pay` marca pagado.
- **No existe**: serie/correlativo SUNAT reales, tipos de comprobante, XML UBL 2.1, firma, envío a SUNAT, CDR, config por clínica.

---

## DECISIÓN CLAVE (pendiente del usuario) — define toda la arquitectura
Cómo se emite a SUNAT:
1. **Vía proveedor OSE/PSE** (Nubefact, Facturactiva, Bizlinks…): enviamos JSON, ellos hacen XML+firma+SUNAT+CDR+PDF. *Recomendado.* Requiere cuenta del proveedor (token).
2. **Directo a SUNAT (self-hosted)**: generamos XML UBL 2.1, firmamos con certificado `.pfx`, enviamos al web service SUNAT, procesamos CDR. Control total, ~5x más trabajo y mantenimiento. Requiere RUC + certificado.
3. **Solo base lista (simulado)**: estructura correcta sin conectar aún. ← **implementado en Fase 1**.

> La Fase 1 se diseñó **agnóstica** a esta decisión: toda la lógica de emisión pasa por una interfaz `EmisorComprobante`; hoy hay un `EmisorSimulado`, mañana se añade `EmisorNubefact` / `EmisorSunatDirecto` sin tocar el resto.

---

## Modelo de datos (Fase 1)
- **`Invoice`** (nuevos campos): `serie` (ej. `B001`/`F001`), `correlativo` (int), `receptorTipoDoc` (0=sin doc, 1=DNI, 6=RUC), `comprobanteEstado` (`pendiente|aceptado|rechazado|observado|anulado`), `sunatHash`, `sunatCdr` (texto/base64), `sunatTicket`. Se reutilizan `electronicInvoice*`.
- **`ComprobanteSerie`** (nueva): `clinicId`, `tipoComprobante` (01=factura, 03=boleta), `serie`, `correlativo` (contador). Un contador por serie, atómico.
- **`SunatConfig`** (nueva, 1:1 con clínica): `ruc`, `razonSocial`, `direccion`, `ambiente` (`beta|produccion`), `proveedor` (`simulado|nubefact|directo`), y campos de credenciales opcionales (token proveedor / ruta certificado) — se llenan al elegir la decisión.

## Servicios (Fase 1)
- `comprobantes/tipos.ts`: catálogos SUNAT (tipo comprobante, tipo doc identidad, afectación IGV, unidad de medida, moneda).
- `comprobantes/emisor.ts`: interfaz `EmisorComprobante { emitir(comprobante): Promise<ResultadoEmision> }` + `EmisorSimulado` (marca `aceptado`, genera hash/CDR simulados). Factory `getEmisor(config)`.
- `comprobantes/comprobante.service.ts`: arma el comprobante desde el `Invoice` + `SunatConfig`, calcula IGV por ítem (gravado/exonerado/inafecto), asigna serie+correlativo atómico, invoca al emisor, persiste resultado.

---

## Blueprint (fases)
### Fase 1: Fundación agnóstica ✅ (local)
Modelo de datos + series/correlativos SUNAT reales + catálogos + interfaz emisor + `EmisorSimulado` + wiring en billing + tests. Sin conectar a SUNAT.
**Validación**: crear boleta y factura → serie/correlativo correctos (`B001-00000001`), IGV correcto, estado `aceptado` (simulado), CDR/hash generados.

### Fase 2: Emisor real (DEPENDE de la decisión)
- Si **proveedor**: `EmisorNubefact` (u otro) — mapear a su API, guardar CDR/PDF reales, manejar errores/reintentos (offline-first: cola).
- Si **directo**: generación XML UBL 2.1 + firma XMLDSig con certificado + cliente SOAP SUNAT + parseo CDR.
**Prerequisito del usuario**: cuenta de proveedor + token, o RUC + certificado `.pfx`.

### Fase 3: UI + operativa
Config SUNAT por clínica (settings), selector boleta/factura con validaciones (factura exige RUC 11 díg.; boleta exige DNI o sin doc), estado del comprobante en la lista/detalle, descarga de PDF/XML/CDR, reintento de envío.

### Fase 4: Notas y resúmenes (si se aprueba alcance ampliado)
Notas de crédito/débito, anulaciones (comunicación de baja), resúmenes diarios de boletas.

### Fase 5: Validación final
typecheck + build + pruebas E2E + tag + aprendizajes.

---

## Gotchas / Reglas SUNAT
- **Series**: factura `F###`, boleta `B###`; correlativo hasta 8 díg., **atómico** (transacción) para no duplicar.
- **Afectación IGV**: servicios de salud pueden ser **exonerados/inafectos** — soportar por ítem, no asumir 18% siempre.
- **Receptor**: factura → RUC (11 díg.) obligatorio; boleta → DNI (8) o consumidor final. Validar.
- **Offline-first**: la emisión a SUNAT es online; encolar y reintentar (patrón sync existente). El comprobante se crea local con estado `pendiente` y se concilia al sincronizar.
- **Ambiente beta**: probar en homologación SUNAT antes de producción.
- **Multi-tenant**: cada clínica su RUC/serie/credenciales; nunca mezclar correlativos entre clínicas.
- **Idempotencia**: no re-emitir un comprobante ya aceptado.

## Anti-patrones
- NO hardcodear IGV 18% en todos los ítems.
- NO generar el XML/firma a mano si se va por proveedor.
- NO exponer el certificado/token en el front ni en el repo.
- NO reutilizar correlativos ni saltarlos.
