'use client'

import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { api } from '@/lib/api'

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

  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
  const label = 'mb-1 block text-sm font-medium text-slate-700'

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
      {/* Logo */}
      <div>
        <label className={label}>Logotipo</label>
        <div className="flex items-center gap-4">
          <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <Upload className="h-8 w-8 text-slate-300" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
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
                className="flex items-center gap-1 text-xs text-red-600 hover:underline"
              >
                <X className="h-3 w-3" /> Quitar logo
              </button>
            )}
            <p className="text-xs text-slate-500">
              PNG, JPG o SVG. Máx 500 KB. Aparecerá en recetas y facturas.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={label}>Nombre</label>
          <input
            className={input}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>RUC / NIT</label>
          <input
            className={input}
            value={form.taxId}
            onChange={(e) => setForm({ ...form, taxId: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>Teléfono</label>
          <input
            className={input}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <label className={label}>Dirección</label>
          <input
            className={input}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>Email</label>
          <input
            type="email"
            className={input}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>País</label>
          <select
            className={input}
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          >
            <option value="PE">Perú</option>
            <option value="CO">Colombia</option>
            <option value="EC">Ecuador</option>
            <option value="BO">Bolivia</option>
            <option value="MX">México</option>
            <option value="CL">Chile</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className={label}>Zona horaria</label>
          <input
            className={input}
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          />
        </div>
      </div>

      {msg && <p className="text-sm text-slate-600">{msg}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
