// Catálogo básico de medicamentos frecuentes en atención primaria (LATAM).
// No pretende ser exhaustivo; el formulario permite escribir libre.

export interface Medication {
  name: string // nombre comercial o DCI
  generic?: string // DCI
  presentation?: string // mg, tabletas, etc.
  defaultDosage?: string
  defaultFrequency?: string
  category: string
}

export const MEDICATIONS: Medication[] = [
  // Analgésicos / antiinflamatorios
  { name: 'Paracetamol', generic: 'Paracetamol', presentation: '500 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 8 horas', category: 'Analgésico' },
  { name: 'Ibuprofeno', generic: 'Ibuprofeno', presentation: '400 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 8 horas', category: 'AINE' },
  { name: 'Naproxeno', generic: 'Naproxeno', presentation: '550 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 12 horas', category: 'AINE' },
  { name: 'Diclofenaco', generic: 'Diclofenaco', presentation: '50 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 8 horas', category: 'AINE' },
  { name: 'Metamizol', generic: 'Metamizol sódico', presentation: '500 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 8 horas', category: 'Analgésico' },
  { name: 'Tramadol', generic: 'Tramadol', presentation: '50 mg', defaultDosage: '1 cápsula', defaultFrequency: 'cada 8 horas', category: 'Opioide' },

  // Antibióticos
  { name: 'Amoxicilina', generic: 'Amoxicilina', presentation: '500 mg', defaultDosage: '1 cápsula', defaultFrequency: 'cada 8 horas', category: 'Antibiótico' },
  { name: 'Amoxicilina + ácido clavulánico', generic: 'Amoxicilina/Clavulánico', presentation: '875/125 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 12 horas', category: 'Antibiótico' },
  { name: 'Azitromicina', generic: 'Azitromicina', presentation: '500 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 24 horas', category: 'Antibiótico' },
  { name: 'Ciprofloxacino', generic: 'Ciprofloxacino', presentation: '500 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 12 horas', category: 'Antibiótico' },
  { name: 'Cefalexina', generic: 'Cefalexina', presentation: '500 mg', defaultDosage: '1 cápsula', defaultFrequency: 'cada 6 horas', category: 'Antibiótico' },
  { name: 'Clindamicina', generic: 'Clindamicina', presentation: '300 mg', defaultDosage: '1 cápsula', defaultFrequency: 'cada 8 horas', category: 'Antibiótico' },
  { name: 'Metronidazol', generic: 'Metronidazol', presentation: '500 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 8 horas', category: 'Antibiótico' },
  { name: 'Trimetoprim/Sulfametoxazol', generic: 'TMP/SMX', presentation: '160/800 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 12 horas', category: 'Antibiótico' },

  // Gastrointestinal
  { name: 'Omeprazol', generic: 'Omeprazol', presentation: '20 mg', defaultDosage: '1 cápsula', defaultFrequency: 'cada 24 horas en ayunas', category: 'IBP' },
  { name: 'Ranitidina', generic: 'Ranitidina', presentation: '150 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 12 horas', category: 'Antiácido' },
  { name: 'Loperamida', generic: 'Loperamida', presentation: '2 mg', defaultDosage: '1 cápsula', defaultFrequency: 'después de cada deposición', category: 'Antidiarreico' },
  { name: 'Metoclopramida', generic: 'Metoclopramida', presentation: '10 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 8 horas', category: 'Antiemético' },
  { name: 'Sales de rehidratación oral', generic: 'SRO', presentation: 'sobre', defaultDosage: '1 sobre disuelto en 1 L de agua', defaultFrequency: 'después de cada deposición', category: 'Hidratación' },

  // Respiratorio
  { name: 'Salbutamol', generic: 'Salbutamol', presentation: 'inhalador 100 mcg', defaultDosage: '2 puffs', defaultFrequency: 'cada 6 horas', category: 'Broncodilatador' },
  { name: 'Ambroxol', generic: 'Ambroxol', presentation: '30 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 8 horas', category: 'Mucolítico' },
  { name: 'Loratadina', generic: 'Loratadina', presentation: '10 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 24 horas', category: 'Antihistamínico' },
  { name: 'Cetirizina', generic: 'Cetirizina', presentation: '10 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 24 horas', category: 'Antihistamínico' },

  // Cardiovascular / crónicos
  { name: 'Enalapril', generic: 'Enalapril', presentation: '10 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 24 horas', category: 'Antihipertensivo' },
  { name: 'Losartán', generic: 'Losartán', presentation: '50 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 24 horas', category: 'Antihipertensivo' },
  { name: 'Amlodipino', generic: 'Amlodipino', presentation: '5 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 24 horas', category: 'Antihipertensivo' },
  { name: 'Atorvastatina', generic: 'Atorvastatina', presentation: '20 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 24 horas en la noche', category: 'Hipolipemiante' },
  { name: 'Metformina', generic: 'Metformina', presentation: '850 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 12 horas con alimentos', category: 'Antidiabético' },
  { name: 'Glibenclamida', generic: 'Glibenclamida', presentation: '5 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 24 horas en el desayuno', category: 'Antidiabético' },

  // Salud mental
  { name: 'Sertralina', generic: 'Sertralina', presentation: '50 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 24 horas', category: 'Antidepresivo' },
  { name: 'Fluoxetina', generic: 'Fluoxetina', presentation: '20 mg', defaultDosage: '1 cápsula', defaultFrequency: 'cada 24 horas', category: 'Antidepresivo' },
  { name: 'Alprazolam', generic: 'Alprazolam', presentation: '0.5 mg', defaultDosage: '1 tableta', defaultFrequency: 'cada 12 horas', category: 'Ansiolítico' },
]

export function searchMedications(query: string): Medication[] {
  const q = query.toLowerCase().trim()
  if (!q) return MEDICATIONS.slice(0, 15)
  return MEDICATIONS.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      (m.generic && m.generic.toLowerCase().includes(q)) ||
      m.category.toLowerCase().includes(q),
  ).slice(0, 20)
}
