#!/usr/bin/env bash
# Crea en Stripe los productos + precios de Jampika con los lookup_key y metadata
# EXACTOS que espera el código (planLookupKey = jampika_<plan>_<monthly|yearly>).
#
# Uso (en tu terminal, la clave NO se guarda en el repo):
#   STRIPE_SECRET_KEY=sk_test_xxx bash scripts/seed-stripe-jampika.sh   # primero TEST
#   STRIPE_SECRET_KEY=sk_live_xxx bash scripts/seed-stripe-jampika.sh   # luego LIVE
#
# Idempotente: reutiliza el producto por metadata; en los precios usa
# transfer_lookup_key=true (re-ejecutar mueve el lookup_key al precio nuevo).
# EDITA LOS IMPORTES (en centavos USD) antes de correr si quieres otros.
set -euo pipefail
: "${STRIPE_SECRET_KEY:?Falta STRIPE_SECRET_KEY (expórtala antes de correr)}"
SK="$STRIPE_SECRET_KEY"

api() { curl -s "https://api.stripe.com/v1/$1" -u "$SK:" "${@:2}"; }
jid() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);process.stdout.write((j.data&&j.data[0]&&j.data[0].id)||j.id||'')}catch(e){process.stdout.write('ERR:'+s.slice(0,200))}})"; }

for plan in consultorio clinica institucion; do
  case "$plan" in
    consultorio) label="Jampika Consultorio";  maxprof="5";         monthly=3900;  yearly=39000  ;;  # $39 / $390
    clinica)     label="Jampika Clínica";      maxprof="15";        monthly=7900;  yearly=79000  ;;  # $79 / $790
    institucion) label="Jampika Institución";  maxprof="unlimited"; monthly=14900; yearly=149000 ;;  # $149 / $1490
  esac

  # Producto (buscar por metadata; crear si no existe)
  pid=$(api "products/search" --data-urlencode "query=active:'true' AND metadata['app']:'jampika' AND metadata['plan']:'$plan'" | jid)
  if [ -z "$pid" ] || [[ "$pid" == ERR:* ]]; then
    pid=$(api "products" \
      -d "name=$label" \
      -d "metadata[app]=jampika" \
      -d "metadata[plan]=$plan" \
      -d "metadata[max_professionals]=$maxprof" \
      -d "metadata[trial_days]=30" | jid)
    echo "producto CREADO  $plan -> $pid"
  else
    echo "producto EXISTE  $plan -> $pid"
  fi

  # Precio mensual
  api "prices" \
    -d "product=$pid" -d "currency=usd" -d "unit_amount=$monthly" \
    -d "recurring[interval]=month" \
    -d "lookup_key=jampika_${plan}_monthly" -d "transfer_lookup_key=true" \
    -d "metadata[app]=jampika" -d "metadata[plan]=$plan" -d "metadata[max_professionals]=$maxprof" \
    >/dev/null && echo "  precio  jampika_${plan}_monthly  = $monthly cts"

  # Precio anual
  api "prices" \
    -d "product=$pid" -d "currency=usd" -d "unit_amount=$yearly" \
    -d "recurring[interval]=year" \
    -d "lookup_key=jampika_${plan}_yearly" -d "transfer_lookup_key=true" \
    -d "metadata[app]=jampika" -d "metadata[plan]=$plan" -d "metadata[max_professionals]=$maxprof" \
    >/dev/null && echo "  precio  jampika_${plan}_yearly   = $yearly cts"
done

echo "Listo. 3 productos + 6 precios con lookup_key jampika_<plan>_<monthly|yearly>."
