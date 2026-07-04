import { create } from 'zustand'
import type { Book, BookDraft, BookStatus, GoogleBookResult } from '../../../shared/types'

export type ViewMode = 'grade' | 'lista' | 'tabela'
export type StatusFilter = BookStatus | 'all'

interface BooksState {
  books: Book[]
  loading: boolean
  filter: StatusFilter
  view: ViewMode

  load: () => Promise<void>
  setFilter: (f: StatusFilter) => void
  setView: (v: ViewMode) => void

  addBook: (draft: BookDraft) => Promise<Book>
  saveBook: (id: number, patch: Partial<BookDraft>) => Promise<Book>
  removeBook: (id: number) => Promise<void>
  searchBooks: (query: string) => Promise<GoogleBookResult[]>
}

export const useBooks = create<BooksState>((set, get) => ({
  books: [],
  loading: false,
  filter: 'all',
  view: 'grade',

  load: async () => {
    set({ loading: true })
    const books = await window.readdeck.books.list('all')
    set({ books, loading: false })
  },
  setFilter: (filter) => set({ filter }),
  setView: (view) => set({ view }),

  addBook: async (draft) => {
    const book = await window.readdeck.books.create(draft)
    await get().load()
    return book
  },
  saveBook: async (id, patch) => {
    const book = await window.readdeck.books.update(id, patch)
    await get().load()
    return book
  },
  removeBook: async (id) => {
    await window.readdeck.books.remove(id)
    await get().load()
  },
  searchBooks: (query) => window.readdeck.books.search(query)
}))
