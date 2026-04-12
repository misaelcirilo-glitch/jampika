'use client'

import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'
import type { BloodType } from '@jampika/shared'
import {
  PatientForm,
  patientToForm,
  type PatientFormValues,
} from '@/features/patients/PatientForm'
import {
  getPatient,
  updatePatient,
} from '@/features/patients/patients.service'

export default function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [initial, setInitial] = useState<PatientFormValues | null>(null)

  useEffect(() => {
    void getPatient(id).then((p) => {
      if (p) setInitial(patientToForm(p))
    })
  }, [id])

  if (!initial) return <p className="text-slate-500">Cargando…</p>

  async function handleSubmit(values: PatientFormValues) {
    await updatePatient(id, {
      documentType: values.documentType,
      documentNumber: values.documentNumber,
      firstName: values.firstName,
      lastName: values.lastName,
      birthDate: values.birthDate || null,
      gender: values.gender,
      bloodType: (values.bloodType || null) as BloodType | null,
      phone: values.phone || null,
      email: values.email || null,
      address: values.address || null,
      emergencyContactName: values.emergencyContactName || null,
      emergencyContactPhone: values.emergencyContactPhone || null,
      insuranceProvider: values.insuranceProvider || null,
      insuranceNumber: values.insuranceNumber || null,
      allergies: values.allergies,
      chronicConditions: values.chronicConditions,
      notes: values.notes || null,
    })
    router.replace(`/patients/${id}`)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Editar paciente</h1>
      <PatientForm
        initial={initial}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        submitLabel="Guardar cambios"
      />
    </div>
  )
}
