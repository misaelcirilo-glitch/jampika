import Link from 'next/link'
import type { ReactNode } from 'react'

/** Datos legales del titular del servicio. Fuente única para todos los documentos. */
export const LEGAL = {
  entidad: 'EMCIVI SERVICES SL',
  // Nota transitoria: la sociedad está en proceso de cambio de denominación.
  // Cuando el cambio quede inscrito, eliminar esta nota y dejar solo `entidad`.
  entidadNota:
    'sociedad en proceso de cambio de denominación social; hasta su inscripción figura como EMCIVI EDUCACION S.L. (mismo CIF)',
  pais: 'España',
  producto: 'Jampika',
  dominio: 'jampika.com',
  correo: 'soporte@jampika.com',
  actualizado: '11 de septiembre de 2026',
} as const

/**
 * Marco visual compartido por las páginas legales (Términos y Privacidad).
 * Página pública: no requiere sesión. Usa los tokens del tema clínico.
 */
export function LegalShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
              J
            </span>
            <span className="text-lg font-bold tracking-tight text-foreground">Jampika</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-primary hover:text-primary/80">
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          <p className="mt-2 text-sm text-muted-foreground">
            Última actualización: {LEGAL.actualizado}
          </p>
        </div>

        <article className="space-y-8 text-sm leading-relaxed text-foreground [&_a]:font-medium [&_a]:text-primary [&_a:hover]:text-primary/80 [&_li]:my-1 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
          {children}
        </article>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
          <span>
            © {new Date().getFullYear()} {LEGAL.entidad} · {LEGAL.producto}
          </span>
          <nav className="flex gap-4">
            <Link href="/terminos" className="hover:text-foreground">
              Términos y condiciones
            </Link>
            <Link href="/privacidad" className="hover:text-foreground">
              Política de privacidad
            </Link>
          </nav>
        </footer>
      </main>
    </div>
  )
}

/** Encabezado de sección numerado, reutilizado por ambos documentos. */
export function LegalSection({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">
        {n}. {title}
      </h2>
      {children}
    </section>
  )
}
