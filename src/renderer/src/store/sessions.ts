import { create } from 'zustand'
import type { SessionWithBook, SessionPatch, TodayStats } from '../../../shared/types'
import { useBooks } from './books'

const RECENT = 60

interface SessionsState {
  today: TodayStats | null
  pace: number | null
  recent: SessionWithBook[]
  refresh: () => Promise<void>
  addSession: (bookId: number, durationMin: number, pagesRead: number) => Promise<void>
  updateSession: (id: number, patch: SessionPatch) => Promise<void>
  removeSession: (id: number) => Promise<void>
}

async function fetchAll(): Promise<Pick<SessionsState, 'today' | 'pace' | 'recent'>> {
  const [today, pace, recent] = await Promise.all([
    window.readdeck.sessions.today(),
    window.readdeck.sessions.pace(),
    window.readdeck.sessions.recent(RECENT)
  ])
  return { today, pace, recent }
}

export const useSessions = create<SessionsState>((set) => ({
  today: null,
  pace: null,
  recent: [],

  refresh: async () => set(await fetchAll()),

  addSession: async (bookId, durationMin, pagesRead) => {
    await window.readdeck.sessions.create(bookId, durationMin, pagesRead)
    // Atualiza estatísticas de sessão E o acervo (progresso do livro mudou).
    set(await fetchAll())
    await useBooks.getState().load()
  },

  updateSession: async (id, patch) => {
    await window.readdeck.sessions.update(id, patch)
    set(await fetchAll())
  },

  removeSession: async (id) => {
    await window.readdeck.sessions.remove(id)
    set(await fetchAll())
  }
}))
