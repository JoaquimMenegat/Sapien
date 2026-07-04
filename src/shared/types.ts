// Tipos compartilhados entre o processo main (Node) e o renderer (React).
// Mantidos aqui para uma única fonte de verdade sobre o modelo de dados.

export type BookStatus = 'wishlist' | 'fila' | 'lendo' | 'pausado' | 'lido'

export const BOOK_STATUSES: BookStatus[] = ['wishlist', 'fila', 'lendo', 'pausado', 'lido']

export const STATUS_LABELS: Record<BookStatus, string> = {
  wishlist: 'Na wishlist',
  fila: 'Na fila',
  lendo: 'Lendo',
  pausado: 'Pausado',
  lido: 'Lido'
}

export type BookFormat = 'fisico' | 'ebook' | 'audiolivro' | 'kindle'

export interface Book {
  id: number
  title: string
  subtitle: string | null
  authors: string | null
  cover_url: string | null
  isbn: string | null
  total_pages: number | null
  current_page: number
  synopsis: string | null
  publisher: string | null
  language: string | null
  format: BookFormat | null
  genres: string | null
  status: BookStatus
  rating: number | null
  public_rating: number | null
  ratings_count: number | null
  started_at: string | null
  finished_at: string | null
  verdict: string | null
  google_books_id: string | null
  created_at: string
  updated_at: string
}

export interface ReadingSession {
  id: number
  book_id: number
  started_at: string
  ended_at: string | null
  duration_min: number
  pages_read: number
}

export interface Goal {
  id: number
  type: string
  target: number
  period: string | null
  created_at: string
}

export interface Note {
  id: number
  book_id: number
  type: 'nota' | 'trecho' | 'callout'
  content: string
  page_ref: number | null
  created_at: string
}

export interface AppHealth {
  ok: boolean
  dbPath: string
  bookCount: number
  appVersion: string
}

// Superfície da API exposta ao renderer via preload (window.readdeck).
export interface ReadDeckApi {
  health(): Promise<AppHealth>
  getSetting(key: string): Promise<string | null>
  setSetting(key: string, value: string): Promise<void>
}
