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
    if (res.status === 401 && (await tryRefresh())) {
      res = await doFetch()
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

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
