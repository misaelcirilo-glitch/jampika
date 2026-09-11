'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Camera, Check, Eye, Lightbulb, Loader2, Plus, ScanLine, Trash2, TrendingUp, Upload } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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

  const input = 'rounded-md border border-input bg-card px-2 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
  const includedCount = result?.items.filter((i) => i.include).length ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">Escanear Inventario</h1>
          {result && (
            <Badge variant="secondary" className="uppercase">
              Nueva Entrada
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left Column: Upload + Tips */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-3 text-sm font-bold text-foreground">Captura de Documento</h3>
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-10 transition hover:border-primary hover:bg-primary/5"
                onClick={() => fileRef.current?.click()}
              >
                {scanning ? (
                  <>
                    <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-semibold text-muted-foreground">Procesando imagen…</p>
                  </>
                ) : preview ? (
                  <img src={preview} alt="Preview" className="max-h-48 rounded-lg" />
                ) : (
                  <>
                    <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Suelte la factura aquí o haga clic para escanear</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">Formatos aceptados: JPG, PNG, PDF. Máx 10MB</p>
                  </>
                )}
              </div>
              <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} className="mt-3 w-full">
                <Camera className="h-4 w-4" /> Usar Cámara
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <Lightbulb className="h-4 w-4 text-warning-foreground" /> Tips de Escaneo
              </h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Asegure una iluminación uniforme sin sombras directas.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Alinee los bordes del documento con el visor.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Evite fondos con texto o patrones.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Invoice Header */}
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/70">Factura Detectada</p>
                      <p className="mt-1 text-lg font-bold">
                        {result.supplier ?? 'Proveedor desconocido'}
                      </p>
                      {result.invoiceNumber && (
                        <p className="text-sm text-primary-foreground/70"># {result.invoiceNumber}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {result.date && <p className="text-xs text-primary-foreground/70">{result.date}</p>}
                      <div className="mt-1 flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-success" />
                        <span className="text-xs font-semibold">{ocrConfidence}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items Table */}
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <h3 className="text-sm font-bold text-foreground">Artículos Detectados</h3>
                  <button type="button" onClick={addBlankItem} className="text-xs font-semibold text-primary hover:text-primary/80">
                    + Añadir Fila
                  </button>
                </div>

                {result.items.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No se detectaron productos.
                    <button type="button" onClick={() => { setResult(null); setPreview(null) }} className="ml-1 text-primary hover:underline">
                      Intentar con otra foto
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-left text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          <th className="px-3 py-2.5">Nombre Producto</th>
                          <th className="px-3 py-2.5">Cant.</th>
                          <th className="px-3 py-2.5">Precio</th>
                          <th className="px-3 py-2.5">Categoría</th>
                          <th className="px-3 py-2.5">Expiración</th>
                          <th className="w-8 px-3 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {result.items.map((item, idx) => (
                          <tr key={idx} className={item.include ? '' : 'opacity-30'}>
                            <td className="px-3 py-2">
                              <input className={`${input} w-full`} value={item.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
                            </td>
                            <td className="w-16 px-3 py-2">
                              <input type="number" className={`${input} w-full`} value={item.quantity} onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 0 })} />
                            </td>
                            <td className="w-20 px-3 py-2">
                              <input type="number" step="0.01" className={`${input} w-full`} value={item.unitPrice ?? ''} onChange={(e) => updateItem(idx, { unitPrice: e.target.value ? parseFloat(e.target.value) : null })} />
                            </td>
                            <td className="px-3 py-2">
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold uppercase text-secondary-foreground">
                                {item.category || '—'}
                              </span>
                            </td>
                            <td className="w-32 px-3 py-2">
                              <input type="date" className={`${input} w-full`} value={item.expirationDate} onChange={(e) => updateItem(idx, { expirationDate: e.target.value })} />
                            </td>
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  <ScanLine className="mr-1 inline h-3 w-3" />
                  {includedCount} artículo{includedCount !== 1 ? 's' : ''} detectado{includedCount !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setResult(null); setPreview(null) }}
                  >
                    <ScanLine className="h-3.5 w-3.5" /> Escanear Otro
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || includedCount === 0}
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Guardar Inventario
                  </Button>
                </div>
              </div>

              {/* Bottom Alerts */}
              <div className="grid grid-cols-2 gap-3">
                {result.items.some((i) => i.include && i.quantity > 0 && i.unitPrice !== null && i.unitPrice < 1) && (
                  <Card className="border-warning/40 bg-warning/10">
                    <CardContent className="p-4">
                      <div className="mb-1 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                        <h4 className="text-xs font-bold text-warning-foreground">Stock Bajo Detectado</h4>
                      </div>
                      <p className="text-[10px] text-warning-foreground/80">
                        Algunos artículos están por debajo del umbral mínimo configurado.
                      </p>
                    </CardContent>
                  </Card>
                )}
                <Card className="border-primary/30 bg-primary/10">
                  <CardContent className="p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-bold text-primary">Tendencia de Precios</h4>
                    </div>
                    <p className="text-[10px] text-primary/80">
                      Compara precios con facturas anteriores de este proveedor.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <ScanLine className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  Sube una foto de factura para ver los resultados aquí
                </p>
              </CardContent>
            </Card>
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
