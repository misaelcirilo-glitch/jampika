'use client'

export default function RecordsPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-slate-800">Historias clínicas</h1>
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
        Busca un paciente en{' '}
        <a href="/patients" className="text-primary-600">
          Pacientes
        </a>{' '}
        para ver y crear consultas.
      </p>
    </div>
  )
}
