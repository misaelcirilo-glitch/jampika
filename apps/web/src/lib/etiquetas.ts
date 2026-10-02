// Etiquetas en español de los valores internos (enums) que guarda la BD.
// Regla: ningún valor interno se pinta tal cual en la interfaz; pasa por aquí.

export const TIPO_REGISTRO: Record<string, string> = {
  consultation: 'Consulta general',
  follow_up: 'Control',
  emergency: 'Emergencia',
  procedure: 'Procedimiento',
  lab_result: 'Resultado de laboratorio',
}

export const TIPO_CITA: Record<string, string> = {
  first_visit: 'Primera visita',
  follow_up: 'Control',
  emergency: 'Emergencia',
  procedure: 'Procedimiento',
  telemedicine: 'Telemedicina',
  'reserva-online': 'Reserva online',
}

export const METODO_PAGO: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  yape: 'Yape',
  plin: 'Plin',
  nequi: 'Nequi',
}

export const ROL: Record<string, string> = {
  admin: 'Administrador',
  doctor: 'Médico',
  receptionist: 'Recepcionista',
  nurse: 'Enfermería',
}

export const GENERO: Record<string, string> = { M: 'Masculino', F: 'Femenino', other: 'Otro' }

export const TIPO_DOCUMENTO: Record<string, string> = {
  'sin-documento': 'Sin documento',
  PASAPORTE: 'Pasaporte',
}

export const CATEGORIA_INVENTARIO: Record<string, string> = {
  medication: 'Medicamento',
  supply: 'Insumo',
  equipment: 'Equipo',
}

// Mensajes de WhatsApp sin texto: el webhook guarda "[tipo]".
export const TIPO_MENSAJE_WHATSAPP: Record<string, string> = {
  image: 'Imagen',
  audio: 'Audio',
  video: 'Video',
  document: 'Documento',
  sticker: 'Sticker',
  location: 'Ubicación',
  contacts: 'Contacto',
  reaction: 'Reacción',
  button: 'Botón',
  interactive: 'Mensaje interactivo',
  unknown: 'Mensaje no compatible',
}

/** Etiqueta de un valor; si no está en el mapa se muestra el valor tal cual (datos libres). */
export function etiqueta(mapa: Record<string, string>, valor: string | null | undefined): string {
  if (!valor) return ''
  return mapa[valor] ?? valor
}

/** Traduce los marcadores "[image]" que guarda el webhook de WhatsApp. */
export function textoMensajeWhatsApp(texto: string | null | undefined): string {
  if (!texto) return ''
  const m = /^\[([a-z_]+)\]$/.exec(texto.trim())
  return m?.[1] ? `[${TIPO_MENSAJE_WHATSAPP[m[1]] ?? m[1]}]` : texto
}

/** Mensaje en español por código HTTP, para cuando la API no envía uno propio. */
export function mensajeHttp(status: number): string {
  if (status === 400) return 'Solicitud inválida.'
  if (status === 401) return 'Tu sesión ha expirado. Vuelve a iniciar sesión.'
  if (status === 403) return 'No tienes permiso para realizar esta acción.'
  if (status === 404) return 'No se encontró lo que buscabas.'
  if (status === 409) return 'Hay un conflicto con datos existentes.'
  if (status === 413) return 'El archivo o los datos son demasiado grandes.'
  if (status === 429) return 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.'
  if (status >= 500) return 'Error del servidor. Inténtalo de nuevo en unos segundos.'
  return 'No se pudo completar la operación.'
}
