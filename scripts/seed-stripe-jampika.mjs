// Crea en Stripe los productos + precios de Jampika con los lookup_key y metadata
// EXACTOS que espera el código (jampika_<plan>_<monthly|yearly>). Sin dependencias
// (usa fetch de Node 18+). Idempotente (reutiliza producto por metadata;
// transfer_lookup_key mueve el lookup_key al precio nuevo si cambias importes).
//
// Uso (en cualquier terminal: PowerShell, Git Bash o CMD):
//   cd C:\Desarrollador\jampika
//   node scripts/seed-stripe-jampika.mjs
// Te pedirá la clave secreta de Stripe y la pegas ahí (no queda en el repo).
//
// EDITA los importes (centavos USD) abajo si quieres otros.

import { readFileSync } from 'node:fs'

// Lee la clave de: 1) variable de entorno, 2) archivo scripts/.stripe-key.txt
// Quita TODO espacio/salto (una clave Stripe no lleva espacios) para que un
// pegado con saltos de línea no la corrompa.
let raw = process.env.STRIPE_SECRET_KEY || ''
if (!raw) {
  try {
    raw = readFileSync(new URL('./.stripe-key.txt', import.meta.url), 'utf8')
  } catch {
    console.error('No hay clave. Pega tu clave secreta de Stripe en el archivo:')
    console.error('  C:\\Desarrollador\\jampika\\scripts\\.stripe-key.txt')
    console.error('guárdalo y vuelve a correr: node scripts/seed-stripe-jampika.mjs')
    process.exit(1)
  }
}
const SK = raw.replace(/\s+/g, '')
if (!SK || !SK.startsWith('sk_')) {
  console.error('Clave inválida. Debe empezar por sk_test_ o sk_live_. (leída: ' + SK.slice(0, 12) + '..., longitud ' + SK.length + ')')
  process.exit(1)
}
console.log(SK.startsWith('sk_live_') ? '>> Modo LIVE (cobros reales)' : '>> Modo TEST')
const AUTH = 'Basic ' + Buffer.from(SK + ':').toString('base64')

async function post(path, params) {
  const res = await fetch('https://api.stripe.com/v1/' + path, {
    method: 'POST',
    headers: { Authorization: AUTH, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  const j = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(j.error || j))
  return j
}
async function search(resource, query) {
  const res = await fetch(
    'https://api.stripe.com/v1/' + resource + '/search?query=' + encodeURIComponent(query),
    { headers: { Authorization: AUTH } },
  )
  const j = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(j.error || j))
  return j
}

const PLANS = [
  { plan: 'consultorio', label: 'Jampika Consultorio', maxprof: '5', monthly: 3900, yearly: 39000 }, // $39 / $390
  { plan: 'clinica', label: 'Jampika Clínica', maxprof: '15', monthly: 7900, yearly: 79000 }, // $79 / $790
  { plan: 'institucion', label: 'Jampika Institución', maxprof: 'unlimited', monthly: 14900, yearly: 149000 }, // $149 / $1490
]

for (const p of PLANS) {
  let pid
  const found = await search('products', `active:'true' AND metadata['app']:'jampika' AND metadata['plan']:'${p.plan}'`)
  if (found.data && found.data[0]) {
    pid = found.data[0].id
    console.log('producto EXISTE ', p.plan, '->', pid)
  } else {
    const prod = await post('products', {
      name: p.label,
      'metadata[app]': 'jampika',
      'metadata[plan]': p.plan,
      'metadata[max_professionals]': p.maxprof,
      'metadata[trial_days]': '30',
    })
    pid = prod.id
    console.log('producto CREADO ', p.plan, '->', pid)
  }

  for (const [period, amount, interval] of [
    ['monthly', p.monthly, 'month'],
    ['yearly', p.yearly, 'year'],
  ]) {
    await post('prices', {
      product: pid,
      currency: 'usd',
      unit_amount: String(amount),
      'recurring[interval]': interval,
      lookup_key: `jampika_${p.plan}_${period}`,
      transfer_lookup_key: 'true',
      'metadata[app]': 'jampika',
      'metadata[plan]': p.plan,
      'metadata[max_professionals]': p.maxprof,
    })
    console.log(`  precio jampika_${p.plan}_${period} = ${amount} cts`)
  }
}

console.log('Listo. 3 productos + 6 precios con lookup_key jampika_<plan>_<monthly|yearly>.')
