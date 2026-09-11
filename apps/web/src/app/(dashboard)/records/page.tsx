'use client'

import { Card } from '@/components/ui/card'

export default function RecordsPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-foreground">Historias clínicas</h1>
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Busca un paciente en{' '}
        <a href="/patients" className="text-primary">
          Pacientes
        </a>{' '}
        para ver y crear consultas.
      </Card>
    </div>
  )
}
