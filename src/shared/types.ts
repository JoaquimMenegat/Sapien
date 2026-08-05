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

export type GoalType =
  | 'livros_ano'
  | 'livros_mes'
  | 'paginas_dia'
  | 'minutos_dia'
  // Metas semanais — base do onboarding ("o que cabe numa semana normal").
  | 'sessoes_semana'
  | 'minutos_semana'

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

export type NoteType = 'nota' | 'trecho' | 'callout'

export interface Note {
  id: number
  book_id: number
  type: NoteType
  content: string
  page_ref: number | null
  created_at: string
}

export interface NotePatch {
  type?: NoteType
  content?: string
  page_ref?: number | null
}

export interface NotesApi {
  list(bookId: number): Promise<Note[]>
  create(bookId: number, type: NoteType, content: string, pageRef: number | null): Promise<Note>
  update(id: number, patch: NotePatch): Promise<Note>
  remove(id: number): Promise<void>
}

// --- Agenda de leitura (grade semanal, estilo Google Agenda) ---

export interface ScheduleSlot {
  id: number
  /** Livro planejado para o horário (opcional — pode ser "leitura livre"). */
  book_id: number | null
  /** 0 = domingo … 6 = sábado. */
  weekday: number
  /** Início em minutos desde 00:00 (ex.: 1290 = 21:30). */
  start_min: number
  duration_min: number
  note: string | null
  created_at: string
}

/** Slot com o título do livro já resolvido (para exibir na grade). */
export interface ScheduleSlotWithBook extends ScheduleSlot {
  book_title: string | null
}

export interface ScheduleDraft {
  book_id?: number | null
  weekday: number
  start_min: number
  duration_min: number
  note?: string | null
}

export interface ScheduleApi {
  list(): Promise<ScheduleSlotWithBook[]>
  create(draft: ScheduleDraft): Promise<ScheduleSlot>
  update(id: number, patch: Partial<ScheduleDraft>): Promise<ScheduleSlot>
  remove(id: number): Promise<void>
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
  picture: string | null
  provider: 'local' | 'google'
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

export interface GoogleConfig {
  configured: boolean
}

export interface AccountApi {
  status(): Promise<AuthStatus>
  signup(
    email: string,
    name: string,
    password: string,
    remember?: boolean,
    captchaToken?: string
  ): Promise<AuthResult>
  login(
    email: string,
    password: string,
    remember?: boolean,
    captchaToken?: string
  ): Promise<AuthResult>
  logout(): Promise<void>
  /** Este usuário acabou de se cadastrar e ainda não fez o onboarding? */
  needsOnboarding(): Promise<boolean>
  /** Marca o onboarding como concluído (não volta a aparecer). */
  completeOnboarding(): Promise<void>
  updateProfile(name: string, picture: string | null): Promise<AuthResult>
  /** Troca a senha (reautentica com a atual). Contas Google não têm senha. */
  changePassword(currentPassword: string, newPassword: string): Promise<AuthResult>
  /** Envia por e-mail um link para redefinir a senha (esqueci minha senha). */
  requestPasswordReset(email: string, captchaToken?: string): Promise<AuthResult>
  /** Define a nova senha no fim do fluxo de recuperação (a sessão vem do link). */
  completePasswordReset(newPassword: string): Promise<AuthResult>
  /** Troca o e-mail da conta. Na web, dispara um e-mail de confirmação. */
  changeEmail(newEmail: string): Promise<AuthResult>
  /** Exclui a própria conta e TODOS os dados. Irreversível. */
  deleteAccount(): Promise<AuthResult>
  /** Escolhe uma imagem local e devolve a URL (readdeck-cover://) para usar como avatar. */
  pickAvatar(): Promise<string | null>
  googleConfig(): Promise<GoogleConfig>
  setGoogleConfig(clientId: string, clientSecret: string): Promise<void>
  googleSignIn(remember?: boolean): Promise<AuthResult>
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

// Estatística de um dia (para gráficos de evolução).
export interface DailyStat {
  day: string // 'YYYY-MM-DD'
  sessions: number
  pages: number
  minutes: number
}

// Sessão com o título do livro embutido (para listagens).
export interface SessionWithBook extends ReadingSession {
  book_title: string
}

// Campos editáveis de uma sessão registrada (histórico).
export interface SessionPatch {
  book_id?: number
  duration_min?: number
  pages_read?: number
}

export interface SessionsApi {
  create(bookId: number, durationMin: number, pagesRead: number): Promise<ReadingSession>
  recent(limit?: number): Promise<SessionWithBook[]>
  /** Edita um registro de sessão (livro/páginas/duração). */
  update(id: number, patch: SessionPatch): Promise<ReadingSession>
  /** Exclui um registro de sessão. */
  remove(id: number): Promise<void>
  /** Ritmo medido em páginas/hora a partir das sessões (null se não houver dados). */
  pace(): Promise<number | null>
  today(): Promise<TodayStats>
  /** Série dos últimos N dias (preenchendo dias sem sessão com zero). */
  daily(days: number): Promise<DailyStat[]>
}

// Superfície da API exposta ao renderer via preload (window.readdeck).
// --- Assinatura (Premium) ---

export type PlanKind = 'free' | 'monthly' | 'yearly'
export type SubStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled'

export interface BillingStatus {
  /** Acesso Premium liberado agora? (assinatura ativa OU trial vigente) */
  premium: boolean
  plan: PlanKind
  status: SubStatus
  trialEndsAt: string | null
  currentPeriodEnd: string | null
}

/** Planos pagos (o que o usuário pode assinar). */
export type PaidPlan = 'monthly' | 'yearly'

export interface SubscribeResult {
  ok: boolean
  /** Link de pagamento do Asaas (Pix/boleto/cartão) para abrir no navegador. */
  invoiceUrl?: string
  error?: string
}

export interface CancelResult {
  ok: boolean
  error?: string
}

/** Uma cobrança do histórico (vinda do Asaas). */
export interface BillingPayment {
  id: string
  dueDate: string | null
  paidDate: string | null
  value: number
  /** Estado cru do Asaas: CONFIRMED, RECEIVED, PENDING, OVERDUE, REFUNDED… */
  status: string
  /** PIX | BOLETO | CREDIT_CARD | UNDEFINED */
  billingType: string
  invoiceUrl: string | null
}

/** Visão completa da assinatura para a página "Gerenciar assinatura". */
export interface BillingDetails {
  premium: boolean
  plan: PlanKind
  status: SubStatus
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  /** Data de adesão (criação da assinatura no Asaas). */
  startDate: string | null
  /** Próximo vencimento. */
  nextDueDate: string | null
  /** Valor recorrente (R$). */
  value: number | null
  /** Forma de pagamento efetiva (PIX/BOLETO/CREDIT_CARD) ou null. */
  billingType: string | null
  payments: BillingPayment[]
}

export interface BillingApi {
  status(): Promise<BillingStatus>
  /** Detalhes ricos p/ a tela de gerenciamento (enriquecidos pelo Asaas). */
  details(): Promise<BillingDetails>
  /** Cria a assinatura e devolve o link de pagamento (só na web). Exige CPF/CNPJ. */
  subscribe(plan: PaidPlan, cpfCnpj: string): Promise<SubscribeResult>
  /** Cancela a renovação; o acesso segue até o fim do período pago (só na web). */
  cancel(): Promise<CancelResult>
}

export interface ReadDeckApi {
  health(): Promise<AppHealth>
  getSetting(key: string): Promise<string | null>
  setSetting(key: string, value: string): Promise<void>
  account: AccountApi
  books: BooksApi
  ai: AiApi
  sessions: SessionsApi
  goals: GoalsApi
  notes: NotesApi
  schedule: ScheduleApi
  billing: BillingApi
}
