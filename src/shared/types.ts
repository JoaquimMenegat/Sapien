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

// Payload para criar/editar um livro (sem id/timestamps, todos opcionais menos título).
export interface BookDraft {
  title: string
  subtitle?: string | null
  authors?: string | null
  cover_url?: string | null
  isbn?: string | null
  total_pages?: number | null
  current_page?: number
  synopsis?: string | null
  publisher?: string | null
  language?: string | null
  format?: BookFormat | null
  genres?: string | null
  status?: BookStatus
  rating?: number | null
  public_rating?: number | null
  ratings_count?: number | null
  started_at?: string | null
  finished_at?: string | null
  verdict?: string | null
  google_books_id?: string | null
}

// Resultado normalizado da API do Google Books (uma edição encontrada).
export interface GoogleBookResult {
  google_books_id: string
  title: string
  subtitle: string | null
  authors: string | null
  publisher: string | null
  published_date: string | null
  synopsis: string | null
  total_pages: number | null
  genres: string | null
  cover_url: string | null
  isbn: string | null
  language: string | null
  public_rating: number | null
  ratings_count: number | null
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

// --- Conta / autenticação (local, offline) ---

export interface AccountInfo {
  email: string
  name: string
}

export interface AuthStatus {
  hasAccount: boolean // já existe uma conta cadastrada neste computador?
  loggedIn: boolean // a sessão atual está autenticada?
  account: AccountInfo | null
}

export interface AuthResult {
  ok: boolean
  error?: string
  account?: AccountInfo
}

export interface AccountApi {
  status(): Promise<AuthStatus>
  signup(email: string, name: string, password: string): Promise<AuthResult>
  login(email: string, password: string): Promise<AuthResult>
  logout(): Promise<void>
}

export interface BooksApi {
  list(status?: BookStatus | 'all'): Promise<Book[]>
  get(id: number): Promise<Book | null>
  create(draft: BookDraft): Promise<Book>
  update(id: number, patch: Partial<BookDraft>): Promise<Book>
  remove(id: number): Promise<void>
  search(query: string): Promise<GoogleBookResult[]>
  /** Abre um seletor de arquivo e devolve a URL da capa copiada (ou null se cancelar). */
  pickCover(): Promise<string | null>
}

// Superfície da API exposta ao renderer via preload (window.readdeck).
export interface ReadDeckApi {
  health(): Promise<AppHealth>
  getSetting(key: string): Promise<string | null>
  setSetting(key: string, value: string): Promise<void>
  account: AccountApi
  books: BooksApi
}
