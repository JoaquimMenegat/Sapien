import { create } from 'zustand'
import type { AuthStatus, AuthResult } from '../../../shared/types'

export type Section =
  | 'biblioteca'
  | 'achar'
  | 'generos'
  | 'autores'
  | 'lendo'
  | 'pomodoro'
  | 'metas'
  | 'estatisticas'
  | 'notas'

export type Appearance = 'executivo' | 'literary-light' | 'literary-dark' | 'moderndark'

export const APPEARANCES: { id: Appearance; label: string }[] = [
  { id: 'executivo', label: 'Executivo Indigo' },
  { id: 'literary-light', label: 'Literary claro' },
  { id: 'literary-dark', label: 'Literary escuro' },
  { id: 'moderndark', label: 'Modern Dark' }
]

export function applyAppearance(appearance: Appearance): void {
  const root = document.documentElement
  const style =
    appearance === 'moderndark'
      ? 'moderndark'
      : appearance === 'executivo'
        ? 'executivo'
        : 'literary'
  root.setAttribute('data-style', style)
  root.classList.toggle('dark', appearance !== 'literary-light')
}

// Aparência usada na tela de login/cadastro: sempre escura (a marca Executivo Indigo).
// Se o usuário já usa um tema escuro, mantemos o dele; se usa claro, cai no Executivo.
export function loginAppearance(saved: Appearance): Appearance {
  return saved === 'literary-light' ? 'executivo' : saved
}

// --- Personalização: cor de acento e estilo de animação ---

export type AnimStyle = 'sutil' | 'rico' | 'nenhuma'

export const ACCENTS: { id: string; label: string; base: string; hover: string }[] = [
  { id: 'tema', label: 'Padrão do tema', base: '', hover: '' },
  { id: 'clay', label: 'Argila', base: '#da7756', hover: '#c96544' },
  { id: 'blue', label: 'Azul', base: '#3b82f6', hover: '#2563eb' },
  { id: 'indigo', label: 'Índigo', base: '#6366f1', hover: '#4f46e5' },
  { id: 'violet', label: 'Violeta', base: '#8b5cf6', hover: '#7c3aed' },
  { id: 'pink', label: 'Rosa', base: '#ec4899', hover: '#db2777' },
  { id: 'red', label: 'Vermelho', base: '#ef4444', hover: '#dc2626' },
  { id: 'amber', label: 'Âmbar', base: '#f59e0b', hover: '#d97706' },
  { id: 'emerald', label: 'Esmeralda', base: '#10b981', hover: '#059669' },
  { id: 'teal', label: 'Turquesa', base: '#14b8a6', hover: '#0d9488' }
]

function hexToTriplet(hex: string): string {
  const h = hex.replace('#', '')
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`
}

function applyAccent(id: string): void {
  const root = document.documentElement
  const a = ACCENTS.find((x) => x.id === id)
  if (!a || id === 'tema' || !a.base) {
    // Volta ao acento padrão do tema (definido no CSS).
    root.style.removeProperty('--c-accent')
    root.style.removeProperty('--c-accent-hover')
    return
  }
  root.style.setProperty('--c-accent', hexToTriplet(a.base))
  root.style.setProperty('--c-accent-hover', hexToTriplet(a.hover))
}

function applyAnimation(a: AnimStyle): void {
  document.documentElement.setAttribute('data-anim', a)
}

interface AppState {
  section: Section
  setSection: (s: Section) => void

  // Abre o modal de adicionar livro na Biblioteca (acionado pela topbar).
  addBookOpen: boolean
  setAddBookOpen: (v: boolean) => void

  appearance: Appearance
  setAppearance: (a: Appearance) => void
  initAppearance: () => Promise<void>

  accent: string
  setAccent: (id: string) => void
  animation: AnimStyle
  setAnimation: (a: AnimStyle) => void

  // Autenticação
  auth: AuthStatus | null
  authReady: boolean
  refreshAuth: () => Promise<void>
  signup: (email: string, name: string, password: string, remember?: boolean) => Promise<AuthResult>
  login: (email: string, password: string, remember?: boolean) => Promise<AuthResult>
  logout: () => Promise<void>
  googleSignIn: (remember?: boolean) => Promise<AuthResult>
  updateProfile: (name: string, picture: string | null) => Promise<AuthResult>
}

export const useApp = create<AppState>((set, get) => ({
  section: 'biblioteca',
  setSection: (section) => set({ section }),

  addBookOpen: false,
  setAddBookOpen: (addBookOpen) => set({ addBookOpen }),

  appearance: 'executivo',
  setAppearance: (appearance) => {
    applyAppearance(appearance)
    void window.readdeck.setSetting('appearance', appearance)
    set({ appearance })
  },
  initAppearance: async () => {
    const [savedApp, savedAccent, savedAnim] = await Promise.all([
      window.readdeck.getSetting('appearance'),
      window.readdeck.getSetting('ui.accent'),
      window.readdeck.getSetting('ui.animation')
    ])
    const appearance: Appearance = (savedApp as Appearance) ?? 'executivo'
    const accent = savedAccent ?? 'tema'
    const animation = (savedAnim as AnimStyle) ?? 'sutil'
    applyAppearance(appearance)
    applyAccent(accent)
    applyAnimation(animation)
    set({ appearance, accent, animation })
  },

  accent: 'tema',
  setAccent: (id) => {
    applyAccent(id)
    void window.readdeck.setSetting('ui.accent', id)
    set({ accent: id })
  },
  animation: 'sutil',
  setAnimation: (a) => {
    applyAnimation(a)
    void window.readdeck.setSetting('ui.animation', a)
    set({ animation: a })
  },

  auth: null,
  authReady: false,
  refreshAuth: async () => {
    const auth = await window.readdeck.account.status()
    set({ auth, authReady: true })
  },
  signup: async (email, name, password, remember) => {
    const res = await window.readdeck.account.signup(email, name, password, remember)
    if (res.ok) await get().refreshAuth()
    return res
  },
  login: async (email, password, remember) => {
    const res = await window.readdeck.account.login(email, password, remember)
    if (res.ok) await get().refreshAuth()
    return res
  },
  logout: async () => {
    await window.readdeck.account.logout()
    await get().refreshAuth()
  },
  googleSignIn: async (remember) => {
    const res = await window.readdeck.account.googleSignIn(remember)
    if (res.ok) await get().refreshAuth()
    return res
  },
  updateProfile: async (name, picture) => {
    const res = await window.readdeck.account.updateProfile(name, picture)
    if (res.ok) await get().refreshAuth()
    return res
  }
}))
