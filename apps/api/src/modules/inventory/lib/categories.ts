// Diccionario de palabras clave → categoría para auto-clasificar productos médicos.
// Se busca coincidencia parcial (includes) en el nombre del producto.

export interface CategoryRule {
  keywords: string[]
  category: string
}

export const CATEGORY_RULES: CategoryRule[] = [
  // Medicamentos
  { keywords: ['amoxicilina', 'azitromicina', 'ciprofloxacino', 'cefalexina', 'clindamicina', 'metronidazol', 'penicilina', 'eritromicina', 'doxiciclina', 'levofloxacino', 'antibiot'], category: 'Antibiótico' },
  { keywords: ['paracetamol', 'ibuprofeno', 'naproxeno', 'diclofenaco', 'metamizol', 'ketorolaco', 'aspirina', 'acetaminof'], category: 'Analgésico' },
  { keywords: ['tramadol', 'morfina', 'codeina', 'fentanilo', 'buprenorfina', 'oxicodona'], category: 'Opioide' },
  { keywords: ['omeprazol', 'ranitidina', 'pantoprazol', 'lansoprazol', 'esomeprazol'], category: 'Gastrointestinal' },
  { keywords: ['metoclopramida', 'ondansetron', 'dimenhidrinato'], category: 'Antiemético' },
  { keywords: ['loperamida', 'bismuto', 'rehidratacion', 'suero oral'], category: 'Gastrointestinal' },
  { keywords: ['salbutamol', 'budesonida', 'beclometasona', 'fluticasona', 'montelukast', 'broncodilat'], category: 'Respiratorio' },
  { keywords: ['ambroxol', 'bromhexina', 'acetilcisteina', 'mucolitico', 'dextrometorfano'], category: 'Mucolítico' },
  { keywords: ['loratadina', 'cetirizina', 'clorfenamina', 'desloratadina', 'antihistamin'], category: 'Antihistamínico' },
  { keywords: ['enalapril', 'losartan', 'amlodipino', 'valsartan', 'captopril', 'nifedipino', 'antihipertens'], category: 'Antihipertensivo' },
  { keywords: ['atorvastatina', 'rosuvastatina', 'simvastatina', 'estatina'], category: 'Hipolipemiante' },
  { keywords: ['metformina', 'glibenclamida', 'insulina', 'glimepirida', 'sitagliptina', 'antidiabet'], category: 'Antidiabético' },
  { keywords: ['sertralina', 'fluoxetina', 'paroxetina', 'escitalopram', 'amitriptilina', 'antidepresiv'], category: 'Antidepresivo' },
  { keywords: ['alprazolam', 'diazepam', 'clonazepam', 'lorazepam', 'ansiolitico', 'benzodiacepina'], category: 'Ansiolítico' },
  { keywords: ['prednisona', 'prednisolona', 'dexametasona', 'betametasona', 'hidrocortisona', 'corticoide', 'corticosteroide'], category: 'Corticoide' },
  { keywords: ['lidocaina', 'bupivacaina', 'anestes'], category: 'Anestésico' },
  { keywords: ['warfarina', 'heparina', 'enoxaparina', 'anticoagulante'], category: 'Anticoagulante' },
  { keywords: ['hierro', 'acido folico', 'vitamina', 'complejo b', 'calcio', 'zinc', 'multivitamin'], category: 'Suplemento' },
  { keywords: ['vacuna', 'inmunizacion'], category: 'Vacuna' },

  // Insumos médicos
  { keywords: ['jeringa', 'jeringas'], category: 'Insumo - Inyección' },
  { keywords: ['aguja', 'agujas', 'cateter', 'cánula', 'canula'], category: 'Insumo - Inyección' },
  { keywords: ['gasa', 'gasas', 'aposito', 'apósito', 'compresa'], category: 'Insumo - Curación' },
  { keywords: ['venda', 'vendas', 'vendaje', 'esparadrapo', 'tela adhesiva', 'micropore'], category: 'Insumo - Curación' },
  { keywords: ['algodon', 'algodón', 'torunda'], category: 'Insumo - Curación' },
  { keywords: ['sutura', 'hilo quirurg'], category: 'Insumo - Curación' },
  { keywords: ['guante', 'guantes'], category: 'Insumo - Protección' },
  { keywords: ['mascarilla', 'cubreboca', 'barbijo', 'tapaboca'], category: 'Insumo - Protección' },
  { keywords: ['bata', 'gorro quirurg', 'campo esteril'], category: 'Insumo - Protección' },
  { keywords: ['bisturi', 'bisturí', 'escalpelo'], category: 'Insumo - Quirúrgico' },
  { keywords: ['sonda', 'sondas'], category: 'Insumo - Sondas' },
  { keywords: ['tubo', 'tubos de ensayo', 'tubo vacutainer', 'lanceta'], category: 'Insumo - Laboratorio' },
  { keywords: ['tira reactiva', 'glucomet', 'oximetro', 'oxímetro', 'termometro', 'termómetro'], category: 'Insumo - Diagnóstico' },

  // Soluciones
  { keywords: ['solucion salina', 'solución salina', 'suero fisiolog', 'cloruro de sodio 0.9'], category: 'Solución IV' },
  { keywords: ['dextrosa', 'ringer', 'hartmann'], category: 'Solución IV' },
  { keywords: ['alcohol', 'isopropil', 'yodo', 'povidona', 'clorhexidina', 'antiseptico', 'antiséptico', 'desinfectante'], category: 'Antiséptico' },

  // Equipo
  { keywords: ['esfigmomanometro', 'esfigmomanómetro', 'estetoscopio', 'otoscopio', 'oftalmoscopio'], category: 'Equipo médico' },
  { keywords: ['nebulizador', 'aspirador', 'desfibrilador'], category: 'Equipo médico' },
]

/** Dado un nombre de producto, devuelve la categoría más probable o 'Sin categoría'. */
export function classifyProduct(name: string): string {
  const lower = name.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category
    }
  }
  return 'Sin categoría'
}
