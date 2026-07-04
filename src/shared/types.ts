// Tipos compartilhados entre o processo main (Node) e o renderer (React).
// Mantidos aqui para uma única fonte de verdade sobre o modelo de dados.

export type BookStatus = 'wishlist' | 'fila' | 'lendo' | 'pausado' | 'lido' | 'abandonado'

export const BOOK_STATUSES: BookStatus[] = [
  'wishlist',
  'fila',
  'lendo',
  'pausado',
  'lido',
  'abandonado'
]

export const STATUS_LABELS: Record<BookStatus, string> = {
  wishlist: 'Na wishlist',
  fila: 'Na fila',
  lendo: 'Lendo',
  pausado: 'Pausado',
  lido: 'Lido',
  abandonado: 'Abandonado'
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

export type GoalType = 'livros_ano' | 'livros_mes' | 'paginas_dia' | 'minutos_dia'

export interface Goal {
  id: number
  type: string
  target: number
  period: string | null
  created_at: string
}

export interface GoalsApi {
  list(): Promise<Goal[]>
  set(type: GoalType, target: number): Promise<Goal>
  remove(id: number): Promise<void>
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

// --- Agente de IA "Achar um livro" (Claude API) ---

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiStatus {
  hasKey: boolean
  model: string
}

export interface AiResult {
  ok: boolean
  text?: string
  error?: string
}

export const AI_MODELS: { id: string; label: string; hint: string }[] = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', hint: 'Mais capaz (padrão)' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', hint: 'Equilíbrio' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', hint: 'Rápido e barato' }
]

export interface AiApi {
  status(): Promise<AiStatus>
  setKey(key: string): Promise<void>
  setModel(model: string): Promise<void>
  chat(messages: ChatMessage[]): Promise<AiResult>
}

// --- Pomodoro / sessões de leitura ---

export interface TodayStats {
  sessions: number
  pages: number
  minutes: number
}

// Sessão com o título do livro embutido (para listagens).
export interface SessionWithBook extends ReadingSession {
  book_title: string
}

export interface SessionsApi {
  create(bookId: number, durationMin: number, pagesRead: number): Promise<ReadingSession>
  recent(limit?: number): Promise<SessionWithBook[]>
  /** Ritmo medido em páginas/hora a partir das sessões (null se não houver dados). */
  pace(): Promise<number | null>
  today(): Promise<TodayStats>
}

// Superfície da API exposta ao renderer via preload (window.readdeck).
export interface ReadDeckApi {
  health(): Promise<AppHealth>
  getSetting(key: string): Promise<string | null>
  setSetting(key: string, value: string): Promise<void>
  account: AccountApi
  books: BooksApi
  ai: AiApi
  sessions: SessionsApi
  goals: GoalsApi
}
