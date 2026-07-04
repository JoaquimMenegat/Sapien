import { create } from 'zustand'

export type Section =
  | 'biblioteca'
  | 'lendo'
  | 'pomodoro'
  | 'metas'
  | 'estatisticas'
  | 'notas'

export type ThemeMode = 'light' | 'dark'

interface AppState {
  section: Section
  setSection: (s: Section) => void

  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
  toggleTheme: () => void

  /** Carrega o tema salvo no banco e aplica ao <html>. */
  initTheme: () => Promise<void>
}

function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
}

export const useApp = create<AppState>((set, get) => ({
  section: 'biblioteca',
  setSection: (section) => set({ section }),

  theme: 'light',
  setTheme: (theme) => {
    applyTheme(theme)
    void window.readdeck.setSetting('theme', theme)
    set({ theme })
  },
  toggleTheme: () => {
    const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },

  initTheme: async () => {
    const saved = (await window.readdeck.getSetting('theme')) as ThemeMode | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme: ThemeMode = saved ?? (prefersDark ? 'dark' : 'light')
    applyTheme(theme)
    set({ theme })
  }
}))
