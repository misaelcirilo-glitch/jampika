import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="text-xl font-semibold text-foreground">Página no encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">La dirección que buscas no existe o se ha movido.</p>
      <Link href="/dashboard" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Volver al inicio
      </Link>
    </main>
  )
}
