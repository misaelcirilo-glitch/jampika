'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  doctor: 'Doctor',
  receptionist: 'Recepción',
  nurse: 'Enfermería',
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export function UsersTab({ users, onChanged }: { users: any[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)

  async function toggleActive(u: any) {
    if (!confirm(`¿Desactivar a ${u.firstName} ${u.lastName}?`)) return
    await api.delete(`/settings/users/${u.id}`)
    onChanged()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Nuevo profesional
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6" />
              <TableHead>Nombre</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Especialidad</TableHead>
              <TableHead>Licencia</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className={u.isActive === false ? 'opacity-40' : ''}>
                <TableCell>
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: u.color ?? '#cbd5e1' }}
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground">
                    {u.firstName} {u.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">{ROLE_LABELS[u.role] ?? u.role}</TableCell>
                <TableCell className="text-muted-foreground">{u.specialty ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{u.licenseNumber ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-1 h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => setEditing(u)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => toggleActive(u)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {(creating || editing) && (
        <UserModal
          user={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            onChanged()
          }}
        />
      )}
    </div>
  )
}

function UserModal({
  user,
  onClose,
  onSaved,
}: {
  user: any | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    email: user?.email ?? '',
    password: '',
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    role: user?.role ?? 'doctor',
    specialty: user?.specialty ?? '',
    licenseNumber: user?.licenseNumber ?? '',
    phone: user?.phone ?? '',
    color: user?.color ?? DEFAULT_COLORS[0],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body: any = { ...form }
      if (!body.password) delete body.password
      if (user) {
        await api.put(`/settings/users/${user.id}`, body)
      } else {
        if (!body.password) throw new Error('Contraseña requerida')
        await api.post('/settings/users', body)
      }
      onSaved()
    } catch (err: any) {
      setError(err?.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <Card className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden shadow-lg">
        <h3 className="border-b border-border px-6 py-4 text-lg font-semibold text-foreground">
          {user ? 'Editar profesional' : 'Nuevo profesional'}
        </h3>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Nombres</Label>
              <Input
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block">Apellidos</Label>
              <Input
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block">Email</Label>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block">
                {user ? 'Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block">Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="receptionist">Recepción</SelectItem>
                  <SelectItem value="nurse">Enfermería</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Especialidad</Label>
              <Input
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block">Licencia (CMP / RM / Cédula)</Label>
              <Input
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
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
              <Label className="mb-1 block">Color en agenda</Label>
              <div className="flex gap-2">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-8 w-8 rounded-full border-2 transition ${
                      form.color === c ? 'border-foreground scale-110' : 'border-card'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          </div>

          <div className="flex justify-end gap-2 border-t border-border bg-muted p-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
