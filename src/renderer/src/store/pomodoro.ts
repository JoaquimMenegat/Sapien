import { create } from 'zustand'
import { useSessions } from './sessions'

export type Mode = 'foco' | 'pausa'

// Estado do Pomodoro vive num store global (não no componente da tela), então o
// timer continua rodando quando o usuário navega para outras seções. O tique e os
// efeitos (beep, widget flutuante, modal de registro) ficam no PomodoroEngine.
interface PomodoroState {
  focusMin: number
  breakMin: number
  mode: Mode
  secondsLeft: number
  running: boolean
  bookId: number | null
  initialized: boolean
  endedAt: number // timestamp de quando o contador zerou (dispara o beep no engine)

  // Modal de registro
  showRec: boolean
  recBook: number | null
  recPages: string
  recHours: string
  recMins: string
  saving: boolean

  init: () => Promise<void>
  totalSeconds: (m?: Mode) => number
  setBookId: (id: number | null) => void
  setFocus: (n: number) => void
  setBreak: (n: number) => void
  toggleRun: () => void
  switchMode: (m: Mode) => void
  reset: () => void
  tick: () => void
  openRecord: (minutes: number) => void
  endAndRecord: () => void
  setRecBook: (id: number | null) => void
  setRecPages: (v: string) => void
  setRecHours: (v: string) => void
  setRecMins: (v: string) => void
  closeRec: () => void
  save: () => Promise<void>
}

export const usePomodoro = create<PomodoroState>((set, get) => ({
  focusMin: 25,
  breakMin: 5,
  mode: 'foco',
  secondsLeft: 25 * 60,
  running: false,
  bookId: null,
  initialized: false,
  endedAt: 0,

  showRec: false,
  recBook: null,
  recPages: '',
  recHours: '',
  recMins: '',
  saving: false,

  init: async () => {
    if (get().initialized) return
    const [fv, bv] = await Promise.all([
      window.readdeck.getSetting('pomodoro.focus'),
      window.readdeck.getSetting('pomodoro.break')
    ])
    const f = parseInt(fv ?? '', 10)
    const b = parseInt(bv ?? '', 10)
    const focusMin = Number.isFinite(f) && f > 0 ? f : 25
    const breakMin = Number.isFinite(b) && b > 0 ? b : 5
    set({ focusMin, breakMin, secondsLeft: focusMin * 60, initialized: true })
  },

  totalSeconds: (m) => {
    const s = get()
    return ((m ?? s.mode) === 'foco' ? s.focusMin : s.breakMin) * 60
  },

  setBookId: (bookId) => set({ bookId }),

  setFocus: (n) => {
    const v = Math.max(1, n || 0)
    void window.readdeck.setSetting('pomodoro.focus', String(v))
    set((s) => ({ focusMin: v, secondsLeft: s.mode === 'foco' && !s.running ? v * 60 : s.secondsLeft }))
  },
  setBreak: (n) => {
    const v = Math.max(1, n || 0)
    void window.readdeck.setSetting('pomodoro.break', String(v))
    set((s) => ({ breakMin: v, secondsLeft: s.mode === 'pausa' && !s.running ? v * 60 : s.secondsLeft }))
  },

  toggleRun: () => set((s) => ({ running: !s.running })),

  switchMode: (m) =>
    set((s) => ({ mode: m, running: false, secondsLeft: (m === 'foco' ? s.focusMin : s.breakMin) * 60 })),

  reset: () =>
    set((s) => ({ running: false, secondsLeft: (s.mode === 'foco' ? s.focusMin : s.breakMin) * 60 })),

  tick: () => {
    const s = get()
    if (!s.running) return
    if (s.secondsLeft > 1) {
      set({ secondsLeft: s.secondsLeft - 1 })
      return
    }
    // acabou
    set({ secondsLeft: 0, running: false, endedAt: Date.now() })
    if (s.mode === 'foco') get().openRecord(s.focusMin)
    else get().switchMode('foco')
  },

  openRecord: (minutes) => {
    const mins = Math.max(1, Math.round(minutes))
    const pace = useSessions.getState().pace
    set({
      showRec: true,
      recBook: get().bookId,
      recHours: mins >= 60 ? String(Math.floor(mins / 60)) : '',
      recMins: String(mins % 60),
      recPages: pace ? String(Math.max(1, Math.round((pace * minutes) / 60))) : ''
    })
  },

  endAndRecord: () => {
    const s = get()
    if (s.mode !== 'foco') {
      get().switchMode('foco')
      return
    }
    set({ running: false })
    get().openRecord(Math.max(1, s.focusMin - s.secondsLeft / 60))
  },

  setRecBook: (recBook) => set({ recBook }),
  setRecPages: (recPages) => set({ recPages }),
  setRecHours: (recHours) => set({ recHours }),
  setRecMins: (recMins) => set({ recMins }),
  closeRec: () => set({ showRec: false }),

  save: async () => {
    const s = get()
    if (!s.recBook) return
    const duration = (parseInt(s.recHours, 10) || 0) * 60 + (parseInt(s.recMins, 10) || 0)
    set({ saving: true })
    await useSessions.getState().addSession(s.recBook, duration, parseInt(s.recPages, 10) || 0)
    set({ saving: false, showRec: false })
    get().switchMode('pausa')
  }
}))
