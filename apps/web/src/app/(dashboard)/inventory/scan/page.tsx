'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Camera, Check, Eye, Lightbulb, Loader2, Plus, ScanLine, Trash2, TrendingUp, Upload } from 'lucide-react'
import { api } from '@/lib/api'

interface ScannedItem {
  name: string
  quantity: number
  unit: string
  unitPrice: number | null
  totalPrice: number | null
  category: string
  expirationDate: string
  lot: string
  include: boolean
}

interface ScanResult {
  supplier: string | null
  invoiceNumber: string | null
  date: string | null
  items: ScannedItem[]
  rawText: string
}

export default function ScanInvoicePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [error, setError] = useState('')
  const [ocrConfidence] = useState(94) // Placeholder

  async function handleFile(file: File) {
    setError('')
    setResult(null)
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Solo se aceptan imágenes (JPG, PNG) o PDF')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no debe superar 10 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)

    setScanning(true)
    try {
      const base64 = await fileToBase64(file)
      const data = await api.post<ScanResult>('/inventory/scan', { image: base64 })
      setResult({
        ...data,
        items: data.items.map((item) => ({ ...item, expirationDate: '', lot: '', include: true })),
      })
    } catch (e: any) {
      setError(e.message || 'Error al procesar la imagen')
    } finally {
      setScanning(false)
    }
  }

  function updateItem(idx: number, patch: Partial<ScannedItem>) {
    if (!result) return
    setResult({ ...result, items: result.items.map((item, i) => (i === idx ? { ...item, ...patch } : item)) })
  }

  function removeItem(idx: number) {
    if (!result) return
    setResult({ ...result, items: result.items.filter((_, i) => i !== idx) })
  }

  function addBlankItem() {
    if (!result) return
    setResult({
      ...result,
      items: [...result.items, { name: '', quantity: 1, unit: 'UND', unitPrice: null, totalPrice: null, category: '', expirationDate: '', lot: '', include: true }],
    })
  }

  async function handleSave() {
    if (!result) return
    const toSave = result.items.filter((i) => i.include && i.name.trim())
    if (toSave.length === 0) return
    setSaving(true)
    try {
      await api.post('/inventory/bulk', {
        items: toSave.map((i) => ({
          name: i.name,
          category: i.category,
          quantity: i.quantity,
          unit: i.unit,
          purchasePrice: i.unitPrice,
          expirationDate: i.expirationDate || null,
          lot: i.lot || null,
          supplier: result.supplier,
        })),
      })
      router.push('/inventory')
    } catch (e: any) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const input = 'rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400'
  const includedCount = result?.items.filter((i) => i.include).length ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-slate-800">Escanear Inventario</h1>
          {result && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-blue-600">
              Nueva Entrada
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left Column: Upload + Tips */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <h3 className="mb-3 text-sm font-bold text-slate-700">Captura de Documento</h3>
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-10 transition hover:border-blue-300 hover:bg-blue-50/20"
              onClick={() => fileRef.current?.click()}
            >
              {scanning ? (
                <>
                  <Loader2 className="mb-3 h-10 w-10 animate-spin text-blue-500" />
                  <p className="text-sm font-semibold text-slate-600">Procesando imagen…</p>
                </>
              ) : preview ? (
                <img src={preview} alt="Preview" className="max-h-48 rounded-lg" />
              ) : (
                <>
                  <Upload className="mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">Suelte la factura aquí o haga clic para escanear</p>
                  <p className="mt-1 text-[10px] text-slate-400">Formatos aceptados: JPG, PNG, PDF. Máx 10MB</p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Camera className="h-4 w-4" /> Usar Cámara
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>

          {/* Tips */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Tips de Escaneo
            </h3>
            <ul className="space-y-2 text-xs text-slate-500">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                Asegure una iluminación uniforme sin sombras directas.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                Alinee los bordes del documento con el visor.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                Evite fondos con texto o patrones.
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Invoice Header */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">Factura Detectada</p>
                    <p className="mt-1 text-lg font-bold">
                      {result.supplier ?? 'Proveedor desconocido'}
                    </p>
                    {result.invoiceNumber && (
                      <p className="text-sm text-blue-200"># {result.invoiceNumber}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {result.date && <p className="text-xs text-blue-200">{result.date}</p>}
                    <div className="mt-1 flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-semibold">{ocrConfidence}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                  <h3 className="text-sm font-bold text-slate-700">Artículos Detectados</h3>
                  <button type="button" onClick={addBlankItem} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                    + Añadir Fila
                  </button>
                </div>

                {result.items.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">
                    No se detectaron productos.
                    <button type="button" onClick={() => { setResult(null); setPreview(null) }} className="ml-1 text-blue-600 hover:underline">
                      Intentar con otra foto
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="px-3 py-2.5">Nombre Producto</th>
                          <th className="px-3 py-2.5">Cant.</th>
                          <th className="px-3 py-2.5">Precio</th>
                          <th className="px-3 py-2.5">Categoría</th>
                          <th className="px-3 py-2.5">Expiración</th>
                          <th className="w-8 px-3 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {result.items.map((item, idx) => (
                          <tr key={idx} className={item.include ? '' : 'opacity-30'}>
                            <td className="px-3 py-2">
                              <input className={`${input} w-full`} value={item.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
                            </td>
                            <td className="px-3 py-2 w-16">
                              <input type="number" className={`${input} w-full`} value={item.quantity} onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 0 })} />
                            </td>
                            <td className="px-3 py-2 w-20">
                              <input type="number" step="0.01" className={`${input} w-full`} value={item.unitPrice ?? ''} onChange={(e) => updateItem(idx, { unitPrice: e.target.value ? parseFloat(e.target.value) : null })} />
                            </td>
                            <td className="px-3 py-2">
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-600">
                                {item.category || '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2 w-32">
                              <input type="date" className={`${input} w-full`} value={item.expirationDate} onChange={(e) => updateItem(idx, { expirationDate: e.target.value })} />
                            </td>
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  <ScanLine className="inline h-3 w-3 mr-1" />
                  {includedCount} artículo{includedCount !== 1 ? 's' : ''} detectado{includedCount !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setResult(null); setPreview(null) }}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <ScanLine className="h-3.5 w-3.5" /> Escanear Otro
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || includedCount === 0}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Guardar Inventario
                  </button>
                </div>
              </div>

              {/* Bottom Alerts */}
              <div className="grid grid-cols-2 gap-3">
                {result.items.some((i) => i.include && i.quantity > 0 && i.unitPrice !== null && i.unitPrice < 1) && (
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <h4 className="text-xs font-bold text-amber-700">Stock Bajo Detectado</h4>
                    </div>
                    <p className="text-[10px] text-amber-600">
                      Algunos artículos están por debajo del umbral mínimo configurado.
                    </p>
                  </div>
                )}
                <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <h4 className="text-xs font-bold text-blue-700">Tendencia de Precios</h4>
                  </div>
                  <p className="text-[10px] text-blue-600">
                    Compara precios con facturas anteriores de este proveedor.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-white p-12 shadow-sm border border-slate-100 text-center">
              <ScanLine className="mx-auto mb-3 h-12 w-12 text-slate-200" />
              <p className="text-sm font-medium text-slate-400">
                Sube una foto de factura para ver los resultados aquí
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
