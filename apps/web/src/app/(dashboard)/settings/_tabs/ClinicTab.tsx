'use client'

import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ClinicTab({ clinic, onSaved }: { clinic: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: clinic.name ?? '',
    taxId: clinic.taxId ?? '',
    address: clinic.address ?? '',
    phone: clinic.phone ?? '',
    email: clinic.email ?? '',
    country: clinic.country ?? 'PE',
    timezone: clinic.timezone ?? 'America/Lima',
    logoUrl: clinic.logoUrl ?? '',
  })

  function handleLogoFile(file: File) {
    if (file.size > 500 * 1024) {
      alert('El logo debe pesar menos de 500 KB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setForm({ ...form, logoUrl: String(reader.result) })
    reader.readAsDataURL(file)
  }
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await api.put('/settings/clinic', form)
      setMsg('Guardado')
      onSaved()
    } catch (err: any) {
      setMsg(err?.message ?? 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Logo */}
        <div>
          <Label className="mb-1 block">Logotipo</Label>
          <div className="flex items-center gap-4">
            <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted">
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground">
                <Upload className="h-4 w-4" />
                {form.logoUrl ? 'Cambiar logo' : 'Subir logo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleLogoFile(f)
                  }}
                />
              </label>
              {form.logoUrl && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, logoUrl: '' })}
                  className="flex items-center gap-1 text-xs text-destructive hover:underline"
                >
                  <X className="h-3 w-3" /> Quitar logo
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                PNG, JPG o SVG. Máx 500 KB. Aparecerá en recetas y facturas.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="mb-1 block">Nombre</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1 block">RUC / NIT</Label>
            <Input
              value={form.taxId}
              onChange={(e) => setForm({ ...form, taxId: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1 block">Teléfono</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label className="mb-1 block">Dirección</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1 block">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1 block">País</Label>
            <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PE">Perú</SelectItem>
                <SelectItem value="CO">Colombia</SelectItem>
                <SelectItem value="EC">Ecuador</SelectItem>
                <SelectItem value="BO">Bolivia</SelectItem>
                <SelectItem value="MX">México</SelectItem>
                <SelectItem value="CL">Chile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="mb-1 block">Zona horaria</Label>
            <Input
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            />
          </div>
        </div>

        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

