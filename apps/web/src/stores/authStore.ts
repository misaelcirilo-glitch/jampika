import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  clinicId: string
}

interface AuthClinic {
  id: string
  name: string
  slug: string
  country: string
  plan: string
}

interface AuthState {
  user: AuthUser | null
  clinic: AuthClinic | null
  isAuthenticated: boolean
  login: (data: { user: AuthUser; clinic: AuthClinic; accessToken: string; refreshToken: string }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      clinic: null,
      isAuthenticated: false,
      login: ({ user, clinic, accessToken, refreshToken }) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('jampika_token', accessToken)
          localStorage.setItem('jampika_refresh', refreshToken)
        }
        set({ user, clinic, isAuthenticated: true })
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('jampika_token')
          localStorage.removeItem('jampika_refresh')
        }
        set({ user: null, clinic: null, isAuthenticated: false })
      },
    }),
    { name: 'jampika-auth' },
  ),
)
