import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Sembrando datos de prueba...')

  // Clínica demo
  const clinic = await prisma.clinic.upsert({
    where: { slug: 'clinica-demo' },
    update: {},
    create: {
      name: 'Clínica Demo Jampika',
      slug: 'clinica-demo',
      ownerId: '00000000-0000-0000-0000-000000000000',
      plan: 'professional',
      country: 'PE',
      timezone: 'America/Lima',
      taxId: '20123456789',
      address: 'Av. Javier Prado 123, Lima',
      phone: '+51 999 888 777',
      email: 'contacto@clinicademo.pe',
    },
  })

  const passwordHash = await bcrypt.hash('jampika123', 10)

  // Admin
  const admin = await prisma.user.upsert({
    where: { clinicId_email: { clinicId: clinic.id, email: 'admin@jampika.dev' } },
    update: {},
    create: {
      clinicId: clinic.id,
      email: 'admin@jampika.dev',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Jampika',
      role: 'admin',
    },
  })

  // Actualizar ownerId de la clínica
  await prisma.clinic.update({
    where: { id: clinic.id },
    data: { ownerId: admin.id },
  })

  // Doctor
  const doctor = await prisma.user.upsert({
    where: { clinicId_email: { clinicId: clinic.id, email: 'doctor@jampika.dev' } },
    update: {},
    create: {
      clinicId: clinic.id,
      email: 'doctor@jampika.dev',
      passwordHash,
      firstName: 'María',
      lastName: 'Pérez',
      role: 'doctor',
      specialty: 'Medicina General',
      licenseNumber: 'CMP-12345',
    },
  })

  // Recepcionista
  await prisma.user.upsert({
    where: { clinicId_email: { clinicId: clinic.id, email: 'recepcion@jampika.dev' } },
    update: {},
    create: {
      clinicId: clinic.id,
      email: 'recepcion@jampika.dev',
      passwordHash,
      firstName: 'Ana',
      lastName: 'Torres',
      role: 'receptionist',
    },
  })

  // Servicios
  const serviciosData = [
    { name: 'Consulta general', category: 'consultation', price: 60, durationMinutes: 30 },
    { name: 'Consulta pediatría', category: 'consultation', price: 80, durationMinutes: 30 },
    { name: 'Electrocardiograma', category: 'procedure', price: 120, durationMinutes: 20 },
    { name: 'Curación menor', category: 'procedure', price: 40, durationMinutes: 15 },
  ]
  for (const s of serviciosData) {
    await prisma.service.create({
      data: { ...s, clinicId: clinic.id },
    })
  }

  // Paciente demo
  const patient = await prisma.patient.upsert({
    where: {
      clinicId_documentType_documentNumber: {
        clinicId: clinic.id,
        documentType: 'DNI',
        documentNumber: '12345678',
      },
    },
    update: {},
    create: {
      clinicId: clinic.id,
      documentType: 'DNI',
      documentNumber: '12345678',
      firstName: 'Juan',
      lastName: 'García',
      birthDate: new Date('1985-05-15'),
      gender: 'M',
      bloodType: 'O+',
      phone: '+51 988 777 666',
      email: 'juan@example.com',
      allergies: ['Penicilina'],
      chronicConditions: ['Hipertensión'],
    },
  })

  // Cita demo mañana
  const manana = new Date()
  manana.setDate(manana.getDate() + 1)
  manana.setHours(10, 0, 0, 0)
  const fin = new Date(manana.getTime() + 30 * 60000)

  await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      patientId: patient.id,
      doctorId: doctor.id,
      startTime: manana,
      endTime: fin,
      durationMinutes: 30,
      status: 'scheduled',
      appointmentType: 'first_visit',
      reason: 'Control de presión arterial',
    },
  })

  // Consulta demo con receta
  const existingRecord = await prisma.medicalRecord.findFirst({
    where: { clinicId: clinic.id, patientId: patient.id },
  })
  if (!existingRecord) {
    await prisma.medicalRecord.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        doctorId: doctor.id,
        recordType: 'consultation',
        recordDate: new Date(),
        subjective: 'Paciente refiere odinofagia y fiebre de 38°C desde hace 2 días.',
        objective: 'Faringe eritematosa con exudado amigdalino. Adenopatías cervicales dolorosas.',
        assessment: 'Faringoamigdalitis aguda probablemente bacteriana.',
        plan: 'Tratamiento antibiótico, antipirético, reposo e hidratación abundante. Control en 7 días.',
        diagnoses: [
          { code: 'J03.9', description: 'Amigdalitis aguda, no especificada' },
          { code: 'R50.9', description: 'Fiebre, no especificada' },
        ],
        vitalSigns: {
          temperature: 38,
          bloodPressureSys: 120,
          bloodPressureDia: 80,
          heartRate: 88,
          spo2: 98,
          weight: 78,
        },
        prescriptions: [
          {
            medication: 'Amoxicilina 500 mg',
            dosage: '1 cápsula',
            frequency: 'cada 8 horas',
            duration: '7 días',
            instructions: 'Tomar con alimentos. Completar el tratamiento aunque mejoren los síntomas.',
          },
          {
            medication: 'Paracetamol 500 mg',
            dosage: '1 tableta',
            frequency: 'cada 8 horas si fiebre o dolor',
            duration: '5 días',
            instructions: 'No exceder 4 tabletas al día.',
          },
        ],
      },
    })
  }

  console.log('✅ Seed completado')
  console.log(`   Clínica: ${clinic.name}`)
  console.log('   Usuarios: admin@jampika.dev / doctor@jampika.dev / recepcion@jampika.dev')
  console.log('   Contraseña: jampika123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
