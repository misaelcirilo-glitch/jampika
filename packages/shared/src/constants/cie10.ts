// Subset de códigos CIE-10 de uso frecuente en atención primaria.
// El catálogo completo se carga desde el servidor o un archivo aparte.

export interface Cie10Code {
  code: string
  description: string
  category: string
}

export const CIE10_COMMON: Cie10Code[] = [
  { code: 'J00', description: 'Rinofaringitis aguda (resfriado común)', category: 'Respiratorio' },
  { code: 'J06.9', description: 'Infección aguda de las vías respiratorias superiores', category: 'Respiratorio' },
  { code: 'J20.9', description: 'Bronquitis aguda', category: 'Respiratorio' },
  { code: 'J45.9', description: 'Asma, no especificada', category: 'Respiratorio' },
  { code: 'A09', description: 'Diarrea y gastroenteritis de presunto origen infeccioso', category: 'Digestivo' },
  { code: 'K29.7', description: 'Gastritis, no especificada', category: 'Digestivo' },
  { code: 'K52.9', description: 'Colitis y gastroenteritis no infecciosa', category: 'Digestivo' },
  { code: 'N39.0', description: 'Infección de vías urinarias, sitio no especificado', category: 'Urinario' },
  { code: 'I10', description: 'Hipertensión esencial (primaria)', category: 'Cardiovascular' },
  { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sin complicaciones', category: 'Endocrino' },
  { code: 'E66.9', description: 'Obesidad, no especificada', category: 'Endocrino' },
  { code: 'R51', description: 'Cefalea', category: 'Síntomas' },
  { code: 'R50.9', description: 'Fiebre, no especificada', category: 'Síntomas' },
  { code: 'M54.5', description: 'Lumbago no especificado', category: 'Musculoesquelético' },
  { code: 'L30.9', description: 'Dermatitis, no especificada', category: 'Piel' },
  { code: 'F32.9', description: 'Episodio depresivo, no especificado', category: 'Salud mental' },
  { code: 'F41.1', description: 'Trastorno de ansiedad generalizada', category: 'Salud mental' },
  { code: 'Z00.0', description: 'Examen médico general', category: 'Preventivo' },
  { code: 'Z34.9', description: 'Supervisión de embarazo normal', category: 'Preventivo' },
  { code: 'B34.9', description: 'Infección viral, no especificada', category: 'Infeccioso' },
]

export function searchCie10(query: string): Cie10Code[] {
  const q = query.toLowerCase().trim()
  if (!q) return CIE10_COMMON.slice(0, 10)
  return CIE10_COMMON.filter(
    (c) => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
  ).slice(0, 20)
}
