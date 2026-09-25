// RDA Colombia — genera en LOCAL el Bundle FHIR de una consulta (sin envío al Ministerio).
// El envío real requiere API Key de una IPS colombiana → PRP propio.
import { Router } from 'express'
import { prisma } from '../../config/database.js'
import { authMiddleware, requireRole } from '../../middleware/auth.js'
import { generarBundleRda } from './fhir/bundle.js'
import { validarBundleRda } from './fhir/validar.js'
import { construirInputRda } from './mapper.js'

const router = Router()
router.use(authMiddleware)

// GET /api/v1/rda-co/records/:recordId/bundle → { bundle, validacion }
router.get('/records/:recordId/bundle', requireRole('doctor', 'admin'), async (req, res, next) => {
  try {
    const clinicId = req.auth!.clinicId
    const recordId = req.params.recordId as string
    const record = await prisma.medicalRecord.findFirst({
      where: { id: recordId, clinicId },
      include: { patient: true, doctor: true, clinic: true },
    })
    if (!record) return res.status(404).json({ error: 'Registro no encontrado' })

    const [rdaPaciente, rdaProfesional, rdaIps, rdaConsulta] = await Promise.all([
      prisma.rdaPacienteCo.findFirst({ where: { patientId: record.patientId, clinicId } }),
      prisma.rdaProfesionalCo.findFirst({ where: { userId: record.doctorId, clinicId } }),
      prisma.rdaIpsCo.findUnique({ where: { clinicId } }),
      prisma.rdaConsultaCo.findFirst({ where: { medicalRecordId: record.id, clinicId } }),
    ])

    const input = construirInputRda({
      record,
      patient: record.patient,
      doctor: record.doctor,
      clinic: record.clinic,
      rdaPaciente,
      rdaProfesional,
      rdaIps,
      rdaConsulta,
    })
    const bundle = generarBundleRda(input)
    res.json({ bundle, validacion: validarBundleRda(bundle) })
  } catch (e) {
    next(e)
  }
})

export default router
