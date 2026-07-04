import { create } from 'zustand'
import type { Note, NoteType, NotePatch } from '../../../shared/types'

interface NotesState {
  bookId: number | null
  notes: Note[]
  loading: boolean
  select: (bookId: number) => Promise<void>
  add: (type: NoteType, content: string, pageRef: number | null) => Promise<void>
  update: (id: number, patch: NotePatch) => Promise<void>
  remove: (id: number) => Promise<void>
}

async function reload(bookId: number): Promise<Note[]> {
  return window.readdeck.notes.list(bookId)
}

export const useNotes = create<NotesState>((set, get) => ({
  bookId: null,
  notes: [],
  loading: false,

  select: async (bookId) => {
    set({ bookId, loading: true })
    const notes = await reload(bookId)
    set({ notes, loading: false })
  },
  add: async (type, content, pageRef) => {
    const bookId = get().bookId
    if (!bookId || !content.trim()) return
    await window.readdeck.notes.create(bookId, type, content.trim(), pageRef)
    set({ notes: await reload(bookId) })
  },
  update: async (id, patch) => {
    const bookId = get().bookId
    await window.readdeck.notes.update(id, patch)
    if (bookId) set({ notes: await reload(bookId) })
  },
  remove: async (id) => {
    const bookId = get().bookId
    await window.readdeck.notes.remove(id)
    if (bookId) set({ notes: await reload(bookId) })
  }
}))
