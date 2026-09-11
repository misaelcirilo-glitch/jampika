// Verifica en Stripe (TEST) que los 6 precios de Jampika existen y se resuelven por
// lookup_key EXACTAMENTE como los busca el código, y crea una sesión de checkout de
// prueba para que la abras y pagues con la tarjeta de test 4242 4242 4242 4242.
//
// Uso: pega tu clave sk_test_... en scripts/.stripe-key.txt, guarda, y corre:
//   node scripts/verify-stripe-jampika.mjs
//
// (No crea nada permanente; solo lee precios y abre una sesión de checkout de prueba.)

import { readFileSync } from 'node:fs'

let raw = process.env.STRIPE_SECRET_KEY || ''
if (!raw) {
  try {
    raw = readFileSync(new URL('./.stripe-key.txt', import.meta.url), 'utf8')
  } catch {
    console.error('Pega tu clave sk_test_... en scripts/.stripe-key.txt y vuelve a correr.')
    process.exit(1)
  }
}
const SK = raw.replace(/\s+/g, '')
if (!SK.startsWith('sk_test_')) {
  console.error('Para esta prueba usa una clave de TEST (sk_test_...). Leída: ' + SK.slice(0, 12) + '...')
  process.exit(1)
}
const AUTH = 'Basic ' + Buffer.from(SK + ':').toString('base64')

async function stripe(path, params) {
  const opts = { headers: { Authorization: AUTH } }
  if (params) {
    opts.method = 'POST'
    opts.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    opts.body = new URLSearchParams(params).toString()
  }
  const res = await fetch('https://api.stripe.com/v1/' + path, opts)
  const j = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(j.error || j))
  return j
}

const PLANS = ['consultorio', 'clinica', 'institucion']
const PERIODS = ['monthly', 'yearly']

console.log('>> Verificando precios por lookup_key (modo TEST)\n')
let ok = 0
const priceByKey = {}
for (const plan of PLANS) {
  for (const period of PERIODS) {
    const key = `jampika_${plan}_${period}`
    const r = await stripe('prices?lookup_keys[]=' + key + '&active=true&limit=1&expand[]=data.product')
    const p = r.data[0]
    if (!p) {
      console.log(`  ✗ ${key}  → NO EXISTE`)
      continue
    }
    priceByKey[key] = p
    const amount = (p.unit_amount / 100).toLocaleString('en-US', { style: 'currency', currency: p.currency.toUpperCase() })
    const maxp = p.metadata?.max_professionals ?? p.product?.metadata?.max_professionals ?? '?'
    console.log(`  ✓ ${key}  → ${amount}/${p.recurring.interval}  (max_prof: ${maxp}, price: ${p.id})`)
    ok++
  }
}
console.log(`\n${ok}/6 precios correctos.`)
if (ok < 6) {
  console.error('Faltan precios: corre primero  node scripts/seed-stripe-jampika.mjs')
  process.exit(1)
}

// Sesión de checkout de prueba (plan Clínica mensual) para pagar con 4242.
const testKey = 'jampika_clinica_monthly'
const price = priceByKey[testKey]
const session = await stripe('checkout/sessions', {
  mode: 'subscription',
  'line_items[0][price]': price.id,
  'line_items[0][quantity]': '1',
  allow_promotion_codes: 'true',
  payment_method_collection: 'always',
  'subscription_data[trial_period_days]': '30',
  'subscription_data[metadata][clinic_id]': 'test-verificacion',
  'subscription_data[metadata][app]': 'jampika',
  success_url: 'https://jampika.com/configuracion?suscripcion=ok',
  cancel_url: 'https://jampika.com/configuracion?suscripcion=cancel',
})

console.log('\n=======================================================')
console.log('ABRE ESTA URL EN EL NAVEGADOR Y PAGA CON LA TARJETA DE TEST:')
console.log('  Tarjeta: 4242 4242 4242 4242   Fecha: cualquiera futura   CVC: cualquiera')
console.log('\n' + session.url)
console.log('=======================================================')
console.log('\nSi ves la pantalla de pago de Stripe con "Jampika Clínica" y $79.00 → todo OK.')
console.log('(Es TEST: no se cobra dinero real.)')
