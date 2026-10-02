'use client'

// Último recurso si falla el layout raíz: sustituye la pantalla en inglés de Next.js.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', margin: 0 }}>
        <main style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Ocurrió un error inesperado</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>Tus datos están a salvo. Recarga la página para continuar.</p>
          <button type="button" onClick={reset} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#0f766e', color: '#fff', cursor: 'pointer' }}>
            Reintentar
          </button>
        </main>
      </body>
    </html>
  )
}
