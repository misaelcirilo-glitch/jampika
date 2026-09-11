// Cliente HTTP que inyecta el token de acceso y maneja refresh automático.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message)
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('jampika_token')
}

function setToken(token: string) {
  localStorage.setItem('jampika_token', token)
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('jampika_refresh')
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) return false
  const data = await res.json()
  setToken(data.accessToken)
  return true
}

/** Sesión expirada e irrecuperable: limpia tokens y manda a iniciar sesión. */
function forceLogout(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem('jampika_token')
    localStorage.removeItem('jampika_refresh')
  } catch {
    /* almacenamiento no disponible */
  }
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login?expirado=1'
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const doFetch = async (): Promise<Response> => {
    const token = getToken()
    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  }

  let res: Response
  try {
    res = await doFetch()
    if (res.status === 401) {
      if (await tryRefresh()) res = await doFetch()
      else forceLogout()
    }
  } catch {
    // fetch() rechaza (TypeError: "Load failed" / "Failed to fetch") cuando no
    // hay red o el servidor no responde. Damos un mensaje claro y accionable.
    throw new ApiError(
      0,
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    )
  }

  const contentType = res.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json') ? await res.json() : null

  if (!res.ok) {
    throw new ApiError(res.status, (data as any)?.error ?? res.statusText, data)
  }
  return data as T
}

/**
 * Descarga un archivo binario (p.ej. CSV) autenticado y dispara la descarga en el
 * navegador. Requiere estar online (pega al backend, no lee de Dexie).
 */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')
  }
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Sube un archivo (FormData) autenticado. NO fija Content-Type: el navegador pone
 * el boundary de multipart. Requiere estar online (pega al backend → Vercel Blob).
 */
export async function apiUpload<T = unknown>(path: string, form: FormData): Promise<T> {
  const doFetch = async (): Promise<Response> => {
    const token = getToken()
    return fetch(`${API_URL}${path}`, {
      method: 'POST',
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  }
  let res: Response
  try {
    res = await doFetch()
    if (res.status === 401) {
      if (await tryRefresh()) res = await doFetch()
      else forceLogout()
    }
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')
  }
  const contentType = res.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json') ? await res.json() : null
  if (!res.ok) throw new ApiError(res.status, (data as any)?.error ?? res.statusText, data)
  return data as T
}

/**
 * Descarga un recurso binario autenticado y lo devuelve como Blob (para crear un
 * objectURL). Usado para servir archivos privados del paciente que no tienen URL
 * pública. Requiere estar online.
 */
export async function apiGetBlob(path: string): Promise<Blob> {
  const doFetch = async (): Promise<Response> => {
    const token = getToken()
    return fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  }
  let res: Response
  try {
    res = await doFetch()
    if (res.status === 401 && (await tryRefresh())) res = await doFetch()
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')
  }
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  return res.blob()
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
