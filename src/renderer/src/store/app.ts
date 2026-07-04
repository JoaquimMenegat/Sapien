import { create } from 'zustand'
import type { AuthStatus, AuthResult } from '../../../shared/types'

export type Section =
  | 'biblioteca'
  | 'achar'
  | 'generos'
  | 'lendo'
  | 'pomodoro'
  | 'metas'
  | 'estatisticas'
  | 'notas'

export type Appearance = 'literary-light' | 'literary-dark' | 'moderndark'

export const APPEARANCES: { id: Appearance; label: string }[] = [
  { id: 'literary-light', label: 'Literary claro' },
  { id: 'literary-dark', label: 'Literary escuro' },
  { id: 'moderndark', label: 'Modern Dark' }
]

function applyAppearance(appearance: Appearance): void {
  const root = document.documentElement
  const style = appearance === 'moderndark' ? 'moderndark' : 'literary'
  root.setAttribute('data-style', style)
  root.classList.toggle('dark', appearance !== 'literary-light')
}

interface AppState {
  section: Section
  setSection: (s: Section) => void

  appearance: Appearance
  setAppearance: (a: Appearance) => void
  initAppearance: () => Promise<void>

  // Autenticação
  auth: AuthStatus | null
  authReady: boolean
  refreshAuth: () => Promise<void>
  signup: (email: string, name: string, password: string) => Promise<AuthResult>
  login: (email: string, password: string) => Promise<AuthResult>
  logout: () => Promise<void>
}

export const useApp = create<AppState>((set, get) => ({
  section: 'biblioteca',
  setSection: (section) => set({ section }),

  appearance: 'literary-dark',
  setAppearance: (appearance) => {
    applyAppearance(appearance)
    void window.readdeck.setSetting('appearance', appearance)
    set({ appearance })
  },
  initAppearance: async () => {
    const saved = (await window.readdeck.getSetting('appearance')) as Appearance | null
    const appearance: Appearance = saved ?? 'literary-dark'
    applyAppearance(appearance)
    set({ appearance })
  },

  auth: null,
  authReady: false,
  refreshAuth: async () => {
    const auth = await window.readdeck.account.status()
    set({ auth, authReady: true })
  },
  signup: async (email, name, password) => {
    const res = await window.readdeck.account.signup(email, name, password)
    if (res.ok) await get().refreshAuth()
    return res
  },
  login: async (email, password) => {
    const res = await window.readdeck.account.login(email, password)
    if (res.ok) await get().refreshAuth()
    return res
  },
  logout: async () => {
    await window.readdeck.account.logout()
    await get().refreshAuth()
  }
}))
