import { create } from 'zustand'
import type { SessionWithBook, TodayStats } from '../../../shared/types'
import { useBooks } from './books'

interface SessionsState {
  today: TodayStats | null
  pace: number | null
  recent: SessionWithBook[]
  refresh: () => Promise<void>
  addSession: (bookId: number, durationMin: number, pagesRead: number) => Promise<void>
}

export const useSessions = create<SessionsState>((set) => ({
  today: null,
  pace: null,
  recent: [],

  refresh: async () => {
    const [today, pace, recent] = await Promise.all([
      window.readdeck.sessions.today(),
      window.readdeck.sessions.pace(),
      window.readdeck.sessions.recent(15)
    ])
    set({ today, pace, recent })
  },

  addSession: async (bookId, durationMin, pagesRead) => {
    await window.readdeck.sessions.create(bookId, durationMin, pagesRead)
    // Atualiza estatísticas de sessão E o acervo (progresso do livro mudou).
    const [today, pace, recent] = await Promise.all([
      window.readdeck.sessions.today(),
      window.readdeck.sessions.pace(),
      window.readdeck.sessions.recent(15)
    ])
    set({ today, pace, recent })
    await useBooks.getState().load()
  }
}))
