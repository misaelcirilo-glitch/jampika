// Parser genérico de texto OCR de facturas de proveedores médicos/farmacéuticos.
// Extrae líneas de productos con: nombre, cantidad, unidad, precio unitario, precio total.

import { classifyProduct } from './categories.js'

export interface ParsedItem {
  name: string
  quantity: number
  unit: string
  unitPrice: number | null
  totalPrice: number | null
  category: string
}

export interface ParseResult {
  supplier: string | null
  invoiceNumber: string | null
  date: string | null
  items: ParsedItem[]
  rawText: string
}

/**
 * Parsea texto OCR de una factura y extrae items.
 * Estrategia: buscar líneas que tengan un patrón numérico de cantidad + texto + precio.
 */
export function parseInvoiceText(text: string): ParseResult {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  const supplier = extractSupplier(lines)
  const invoiceNumber = extractInvoiceNumber(text)
  const date = extractDate(text)
  const items = extractItems(lines)

  return { supplier, invoiceNumber, date, items, rawText: text }
}

function extractSupplier(lines: string[]): string | null {
  // Típicamente el nombre del proveedor está en las primeras líneas
  // Buscar líneas con "S.A.", "S.R.L.", "E.I.R.L.", "S.A.C.", "LTDA", o en mayúsculas largas
  for (const line of lines.slice(0, 8)) {
    if (/\b(S\.?A\.?C?\.?|S\.?R\.?L\.?|E\.?I\.?R\.?L\.?|LTDA|S\.?A\.?\b)/i.test(line)) {
      return line.replace(/\s+/g, ' ').trim()
    }
    // Línea completa en mayúsculas con más de 10 chars (probable nombre de empresa)
    if (line.length > 10 && line === line.toUpperCase() && /[A-Z]{3,}/.test(line) && !/factura|boleta|nota|fecha|ruc|nit|rfc/i.test(line)) {
      return line.replace(/\s+/g, ' ').trim()
    }
  }
  return null
}

function extractInvoiceNumber(text: string): string | null {
  // Patrones: "Factura: F001-00123", "N°: 001-00456", "Nro: 123456", "Invoice #123"
  const patterns = [
    /(?:factura|boleta|nota|invoice|comprobante|n[°ºo]\.?)\s*[:# ]\s*([A-Z0-9][\w-]{3,})/i,
    /(?:serie?\s*[-:]?\s*)?([A-Z]\d{3})\s*[-]\s*(\d{4,})/i,
  ]
  for (const pat of patterns) {
    const m = text.match(pat)
    if (m) return m[0].replace(/^[^:]*:\s*/, '').trim()
  }
  return null
}

function extractDate(text: string): string | null {
  // dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
  const m = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/)
  if (m && m[1] && m[2] && m[3]) {
    const day = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    const year = m[3].length === 2 ? '20' + m[3] : m[3]
    return `${year}-${month}-${day}`
  }
  return null
}

function extractItems(lines: string[]): ParsedItem[] {
  const items: ParsedItem[] = []

  for (const line of lines) {
    const item = tryParseLine(line)
    if (item) items.push(item)
  }

  // Si no encontró nada con el parser estricto, intentar modo relajado
  if (items.length === 0) {
    for (const line of lines) {
      const item = tryParseLineRelaxed(line)
      if (item) items.push(item)
    }
  }

  return items
}

/**
 * Parser estricto: busca líneas tipo factura con cantidad + descripción + precio.
 * Ejemplos que matchea:
 *   "2    Amoxicilina 500mg cap    5.50    11.00"
 *   "10 UND  Guantes de latex M   0.30   3.00"
 *   "1 CJA  Paracetamol 500mg x 100 tab   12.00   12.00"
 */
function tryParseLine(line: string): ParsedItem | null {
  // Patrón: CANTIDAD [UNIDAD] DESCRIPCIÓN PRECIO_UNIT PRECIO_TOTAL
  // Los precios están al final separados por espacios
  const match = line.match(
    /^(\d+(?:[.,]\d+)?)\s+(?:(UND?|CJ[AS]?|FCO|AMP|BLS?|TAB|CAP|SOB|TBO?|PZA?|KIT|PAR|ROLLO?|LT|ML|GR?|KG|CAJA|FRASCO|SOBRE|BLISTER|UNIDAD(?:ES)?|PIEZA|PAQ(?:UETE)?)\s+)?(.+?)\s+(\d+[.,]\d{1,2})(?:\s+(\d+[.,]\d{1,2}))?\s*$/i,
  )

  if (!match || !match[1] || !match[3] || !match[4]) return null

  const quantity = parseNumber(match[1])
  const unit = (match[2] ?? 'UND').toUpperCase()
  const name = cleanProductName(match[3])
  const price1 = parseNumber(match[4])
  const price2 = match[5] ? parseNumber(match[5]) : null

  // Si hay dos precios: el primero es unitario, el segundo es total
  // Si hay uno solo: asumimos que es precio unitario
  const unitPrice = price2 ? price1 : price1
  const totalPrice = price2

  if (quantity <= 0 || !name || name.length < 3) return null

  return {
    name,
    quantity,
    unit: normalizeUnit(unit),
    unitPrice,
    totalPrice,
    category: classifyProduct(name),
  }
}

/**
 * Parser relajado: busca cualquier línea con al menos un número y texto descriptivo
 * que parezca un producto médico/farmacéutico.
 */
function tryParseLineRelaxed(line: string): ParsedItem | null {
  // Necesita al menos un número y texto de más de 5 chars
  if (line.length < 8) return null

  // Buscar cantidad al inicio
  const qtyMatch = line.match(/^(\d+)\s+(.+)/)
  if (!qtyMatch || !qtyMatch[1] || !qtyMatch[2]) return null

  const quantity = parseInt(qtyMatch[1], 10)
  const rest = qtyMatch[2]

  if (quantity <= 0 || quantity > 9999) return null

  // Extraer precio(s) del final
  const priceMatch = rest.match(/^(.+?)\s+(\d+[.,]\d{1,2})(?:\s+(\d+[.,]\d{1,2}))?\s*$/)
  if (priceMatch && priceMatch[1] && priceMatch[2]) {
    const name = cleanProductName(priceMatch[1])
    if (name.length < 3) return null
    const unitPrice = parseNumber(priceMatch[2])
    const totalPrice = priceMatch[3] ? parseNumber(priceMatch[3]) : null
    return {
      name,
      quantity,
      unit: 'UND',
      unitPrice,
      totalPrice,
      category: classifyProduct(name),
    }
  }

  // Sin precio — solo nombre
  const name = cleanProductName(rest)
  if (name.length < 3) return null
  // Solo si parece un producto (tiene categoría reconocida)
  const category = classifyProduct(name)
  if (category === 'Sin categoría') return null

  return {
    name,
    quantity,
    unit: 'UND',
    unitPrice: null,
    totalPrice: null,
    category,
  }
}

function cleanProductName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^[-–—•*]+\s*/, '')
    .replace(/\s*[-–—]+\s*$/, '')
    .trim()
}

function parseNumber(s: string): number {
  return parseFloat(s.replace(',', '.'))
}

function normalizeUnit(unit: string): string {
  const map: Record<string, string> = {
    UND: 'unidad',
    UN: 'unidad',
    UNIDAD: 'unidad',
    UNIDADES: 'unidad',
    CJA: 'caja',
    CAJA: 'caja',
    CJS: 'caja',
    FCO: 'frasco',
    FRASCO: 'frasco',
    AMP: 'ampolla',
    BLS: 'blister',
    BL: 'blister',
    BLISTER: 'blister',
    TAB: 'tableta',
    CAP: 'cápsula',
    SOB: 'sobre',
    SOBRE: 'sobre',
    TBO: 'tubo',
    TB: 'tubo',
    PZA: 'pieza',
    PZ: 'pieza',
    PIEZA: 'pieza',
    KIT: 'kit',
    PAR: 'par',
    ROLLO: 'rollo',
    ROL: 'rollo',
    LT: 'litro',
    ML: 'ml',
    GR: 'gramo',
    G: 'gramo',
    KG: 'kg',
    PAQ: 'paquete',
    PAQUETE: 'paquete',
  }
  return map[unit] ?? unit.toLowerCase()
}
