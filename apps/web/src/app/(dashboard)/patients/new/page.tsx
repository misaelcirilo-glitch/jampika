'use client'

import { useRouter } from 'next/navigation'
import type { BloodType } from '@jampika/shared'
import {
  emptyPatientForm,
  PatientForm,
  type PatientFormValues,
} from '@/features/patients/PatientForm'
import { createPatient } from '@/features/patients/patients.service'

export default function NewPatientPage() {
  const router = useRouter()

  async function handleSubmit(values: PatientFormValues) {
    const patient = await createPatient({
      clinicId: '',
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
    router.replace(`/patients/${patient.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Nuevo paciente</h1>
      <PatientForm
        initial={emptyPatientForm()}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        submitLabel="Guardar paciente"
      />
    </div>
  )
}
