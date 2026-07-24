// Implementação da ponte `window.readdeck` (ReadDeckApi) usando o Supabase — é o
// "backend" da versão web. Mantém exatamente a mesma interface do desktop (IPC),
// então stores e telas continuam iguais. Estatísticas de sessão são calculadas no
// cliente (volume por usuário é pequeno). IA e capas locais ficam para fases futuras.

import { getSupabase } from './supabase'
import type {
  ReadDeckApi,
  AppHealth,
  AuthStatus,
  AuthResult,
  AccountInfo,
  Book,
  BookDraft,
  BookStatus,
  GoogleBookResult,
  AiStatus,
  AiResult,
  ReadingSession,
  SessionWithBook,
  SessionPatch,
  TodayStats,
  DailyStat,
  Goal,
  GoalType,
  Note,
  NoteType,
  NotePatch
} from '../../../shared/types'

const sb = getSupabase

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

async function userId(): Promise<string> {
  const { data } = await sb().auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Não autenticado.')
  return id
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function authError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.'
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Já existe uma conta com esse e-mail.'
  if (m.includes('password should be')) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (m.includes('email') && m.includes('invalid')) return 'E-mail inválido.'
  return msg
}

// Colunas graváveis de um livro (evita mandar campos inexistentes).
const BOOK_COLS: (keyof BookDraft)[] = [
  'title', 'subtitle', 'authors', 'cover_url', 'isbn', 'total_pages', 'current_page',
  'synopsis', 'publisher', 'language', 'format', 'genres', 'status', 'rating',
  'public_rating', 'ratings_count', 'started_at', 'finished_at', 'verdict', 'google_books_id'
]
function bookRow(draft: Partial<BookDraft>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const k of BOOK_COLS) if (draft[k] !== undefined) row[k] = draft[k]
  return row
}

async function getSetting(key: string): Promise<string | null> {
  const { data } = await sb().from('user_settings').select('value').eq('key', key).maybeSingle()
  return (data?.value as string | undefined) ?? null
}

async function getAccount(): Promise<AccountInfo | null> {
  const { data } = await sb().auth.getSession()
  const user = data.session?.user
  if (!user) return null
  const { data: profile } = await sb().from('profiles').select('name,picture').eq('id', user.id).maybeSingle()
  return {
    email: user.email ?? '',
    name: (profile?.name as string) ?? user.user_metadata?.name ?? '',
    picture: (profile?.picture as string) ?? null,
    provider: user.app_metadata?.provider === 'google' ? 'google' : 'local'
  }
}

async function searchGoogleBooks(query: string): Promise<GoogleBookResult[]> {
  const q = query.trim()
  if (!q) return []
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20&langRestrict=pt`
  const res = await fetch(url)
  if (!res.ok) return []
  const json = await res.json()
  const items: Array<{ id: string; volumeInfo?: Record<string, unknown> }> = json.items ?? []
  return items.map((it) => {
    const v = (it.volumeInfo ?? {}) as Record<string, unknown>
    const ids = (v.industryIdentifiers as Array<{ type: string; identifier: string }>) ?? []
    const isbn =
      ids.find((x) => x.type === 'ISBN_13')?.identifier ??
      ids.find((x) => x.type === 'ISBN_10')?.identifier ??
      null
    const img = (v.imageLinks as Record<string, string>)?.thumbnail
    return {
      google_books_id: it.id,
      title: (v.title as string) ?? 'Sem título',
      subtitle: (v.subtitle as string) ?? null,
      authors: (v.authors as string[])?.join(', ') ?? null,
      publisher: (v.publisher as string) ?? null,
      published_date: (v.publishedDate as string) ?? null,
      synopsis: (v.description as string) ?? null,
      total_pages: (v.pageCount as number) ?? null,
      genres: (v.categories as string[])?.join(', ') ?? null,
      cover_url: img ? img.replace('http://', 'https://') : null,
      isbn,
      language: (v.language as string) ?? null,
      public_rating: (v.averageRating as number) ?? null,
      ratings_count: (v.ratingsCount as number) ?? null
    }
  })
}

export function createSupabaseApi(): ReadDeckApi {
  return {
    async health(): Promise<AppHealth> {
      const { count } = await sb().from('books').select('*', { count: 'exact', head: true })
      return { ok: true, dbPath: 'supabase', bookCount: count ?? 0, appVersion: 'web' }
    },

    getSetting,
    async setSetting(key: string, value: string): Promise<void> {
      const user_id = await userId()
      must(await sb().from('user_settings').upsert({ user_id, key, value }).select().single())
    },

    account: {
      async status(): Promise<AuthStatus> {
        const { data } = await sb().auth.getSession()
        const loggedIn = !!data.session
        return { hasAccount: loggedIn, loggedIn, account: loggedIn ? await getAccount() : null }
      },
      async signup(email, name, password): Promise<AuthResult> {
        const { data, error } = await sb().auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } }
        })
        if (error) return { ok: false, error: authError(error.message) }
        if (!data.session) {
          return { ok: false, error: 'Enviamos um e-mail de confirmação. Confirme para entrar.' }
        }
        return { ok: true, account: (await getAccount()) ?? undefined }
      },
      async login(email, password): Promise<AuthResult> {
        const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password })
        if (error) return { ok: false, error: authError(error.message) }
        return { ok: true, account: (await getAccount()) ?? undefined }
      },
      async logout(): Promise<void> {
        await sb().auth.signOut()
      },
      async updateProfile(name, picture): Promise<AuthResult> {
        const id = await userId()
        const patch: Record<string, unknown> = { picture: picture ?? null }
        if (name?.trim()) patch.name = name.trim()
        must(await sb().from('profiles').update(patch).eq('id', id).select().single())
        return { ok: true, account: (await getAccount()) ?? undefined }
      },
      async changePassword(currentPassword, newPassword): Promise<AuthResult> {
        if (newPassword.length < 6) {
          return { ok: false, error: 'A nova senha precisa ter pelo menos 6 caracteres.' }
        }
        const acc = await getAccount()
        // Reautentica com a senha atual — confirma que é o dono antes de trocar.
        if (acc?.email && currentPassword) {
          const { error: reauth } = await sb().auth.signInWithPassword({
            email: acc.email,
            password: currentPassword
          })
          if (reauth) return { ok: false, error: 'Senha atual incorreta.' }
        }
        const { error } = await sb().auth.updateUser({ password: newPassword })
        if (error) return { ok: false, error: authError(error.message) }
        return { ok: true, account: (await getAccount()) ?? undefined }
      },
      async requestPasswordReset(email): Promise<AuthResult> {
        const mail = email.trim()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
          return { ok: false, error: 'E-mail inválido.' }
        }
        // O link do e-mail volta para a própria origem com #type=recovery.
        const redirectTo = `${window.location.origin}/`
        const { error } = await sb().auth.resetPasswordForEmail(mail, { redirectTo })
        if (error) return { ok: false, error: authError(error.message) }
        return { ok: true }
      },
      async completePasswordReset(newPassword): Promise<AuthResult> {
        if (newPassword.length < 6) {
          return { ok: false, error: 'A nova senha precisa ter pelo menos 6 caracteres.' }
        }
        // Aqui a sessão já veio autenticada pelo link — não há senha atual para conferir.
        const { error } = await sb().auth.updateUser({ password: newPassword })
        if (error) return { ok: false, error: authError(error.message) }
        return { ok: true, account: (await getAccount()) ?? undefined }
      },
      async changeEmail(newEmail): Promise<AuthResult> {
        const email = newEmail.trim()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return { ok: false, error: 'E-mail inválido.' }
        }
        // Dispara e-mail(s) de confirmação; a troca só se efetiva após confirmar.
        const { error } = await sb().auth.updateUser({ email })
        if (error) return { ok: false, error: authError(error.message) }
        return { ok: true, account: (await getAccount()) ?? undefined }
      },
      async deleteAccount(): Promise<AuthResult> {
        // Apaga a linha em auth.users; o ON DELETE CASCADE remove todos os dados.
        const { error } = await sb().rpc('delete_own_user')
        if (error) return { ok: false, error: authError(error.message) }
        await sb().auth.signOut()
        return { ok: true }
      },
      async pickAvatar(): Promise<string | null> {
        return null // Upload de avatar via Storage chega numa fase futura.
      },
      async googleConfig() {
        return { configured: false }
      },
      async setGoogleConfig(): Promise<void> {
        /* Google via Supabase OAuth — configurado no painel, não aqui. */
      },
      async googleSignIn(): Promise<AuthResult> {
        return { ok: false, error: 'Login com Google chega em breve na versão web.' }
      }
    },

    books: {
      async list(status?: BookStatus | 'all'): Promise<Book[]> {
        const q =
          status && status !== 'all'
            ? sb().from('books').select('*').eq('status', status).order('updated_at', { ascending: false })
            : sb().from('books').select('*').order('updated_at', { ascending: false })
        return must(await q) as Book[]
      },
      async get(id: number): Promise<Book | null> {
        const { data } = await sb().from('books').select('*').eq('id', id).maybeSingle()
        return (data as Book) ?? null
      },
      async create(draft: BookDraft): Promise<Book> {
        const user_id = await userId()
        const row: Record<string, unknown> = {
          ...bookRow(draft),
          user_id,
          title: draft.title,
          current_page: draft.current_page ?? 0,
          status: draft.status ?? 'wishlist'
        }
        return must(await sb().from('books').insert(row).select().single()) as Book
      },
      async update(id: number, patch: Partial<BookDraft>): Promise<Book> {
        return must(await sb().from('books').update(bookRow(patch)).eq('id', id).select().single()) as Book
      },
      async remove(id: number): Promise<void> {
        must(await sb().from('books').delete().eq('id', id).select())
      },
      search(query: string): Promise<GoogleBookResult[]> {
        return searchGoogleBooks(query)
      },
      async pickCover(): Promise<string | null> {
        return null // Upload de capa via Storage chega numa fase futura.
      }
    },

    ai: {
      async status(): Promise<AiStatus> {
        return { hasKey: false, model: (await getSetting('ai.model')) ?? 'claude-opus-4-8' }
      },
      async setKey(key: string): Promise<void> {
        const user_id = await userId()
        must(await sb().from('user_settings').upsert({ user_id, key: 'ai.apiKey', value: key.trim() }).select().single())
      },
      async setModel(model: string): Promise<void> {
        const user_id = await userId()
        must(await sb().from('user_settings').upsert({ user_id, key: 'ai.model', value: model }).select().single())
      },
      async chat(): Promise<AiResult> {
        return { ok: false, error: 'A IA "Achar um livro" chega em breve na versão web.' }
      }
    },

    sessions: {
      async create(bookId: number, durationMin: number, pagesRead: number): Promise<ReadingSession> {
        const user_id = await userId()
        const session = must(
          await sb()
            .from('reading_sessions')
            .insert({
              user_id,
              book_id: bookId,
              duration_min: Math.max(0, Math.round(durationMin)),
              pages_read: Math.max(0, Math.round(pagesRead))
            })
            .select()
            .single()
        ) as ReadingSession

        if (pagesRead > 0) {
          const book = must(await sb().from('books').select('*').eq('id', bookId).single()) as Book
          const next = book.total_pages
            ? Math.min(book.total_pages, book.current_page + pagesRead)
            : book.current_page + pagesRead
          const patch: Record<string, unknown> = { current_page: next }
          if (book.status === 'wishlist' || book.status === 'fila') {
            patch.status = 'lendo'
            if (!book.started_at) patch.started_at = todayISO()
          }
          await sb().from('books').update(patch).eq('id', bookId)
        }
        return session
      },
      async recent(limit = 20): Promise<SessionWithBook[]> {
        const rows = must(
          await sb()
            .from('reading_sessions')
            .select('*, books(title)')
            .order('started_at', { ascending: false })
            .limit(limit)
        ) as Array<ReadingSession & { books?: { title: string } | null }>
        return rows.map(({ books, ...s }) => ({ ...s, book_title: books?.title ?? '(livro removido)' }))
      },
      async update(id: number, patch: SessionPatch): Promise<ReadingSession> {
        const clean: Record<string, unknown> = {}
        if (patch.book_id != null) clean.book_id = patch.book_id
        if (patch.duration_min != null) clean.duration_min = Math.max(0, Math.round(patch.duration_min))
        if (patch.pages_read != null) clean.pages_read = Math.max(0, Math.round(patch.pages_read))
        return must(await sb().from('reading_sessions').update(clean).eq('id', id).select().single()) as ReadingSession
      },
      async remove(id: number): Promise<void> {
        must(await sb().from('reading_sessions').delete().eq('id', id).select())
      },
      async pace(): Promise<number | null> {
        const rows = must(
          await sb().from('reading_sessions').select('pages_read,duration_min').gt('pages_read', 0).gt('duration_min', 0)
        ) as Array<{ pages_read: number; duration_min: number }>
        const pages = rows.reduce((s, r) => s + r.pages_read, 0)
        const mins = rows.reduce((s, r) => s + r.duration_min, 0)
        if (!pages || !mins) return null
        return Math.round(pages / (mins / 60))
      },
      async today(): Promise<TodayStats> {
        const min = parseInt((await getSetting('reading.minSessionMin')) ?? '0', 10) || 0
        const start = todayISO()
        const rows = must(
          await sb()
            .from('reading_sessions')
            .select('pages_read,duration_min')
            .gte('started_at', `${start}T00:00:00`)
            .gte('duration_min', min)
        ) as Array<{ pages_read: number; duration_min: number }>
        return {
          sessions: rows.length,
          pages: rows.reduce((s, r) => s + r.pages_read, 0),
          minutes: rows.reduce((s, r) => s + r.duration_min, 0)
        }
      },
      async daily(days: number): Promise<DailyStat[]> {
        const n = Math.max(1, Math.min(366, Math.round(days)))
        const min = parseInt((await getSetting('reading.minSessionMin')) ?? '0', 10) || 0
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - (n - 1))
        const startStr = startDate.toISOString().slice(0, 10)

        const rows = must(
          await sb()
            .from('reading_sessions')
            .select('started_at,duration_min,pages_read')
            .gte('started_at', `${startStr}T00:00:00`)
        ) as Array<{ started_at: string; duration_min: number; pages_read: number }>

        const map = new Map<string, DailyStat>()
        for (let i = 0; i < n; i++) {
          const d = new Date(startDate)
          d.setDate(startDate.getDate() + i)
          const key = d.toISOString().slice(0, 10)
          map.set(key, { day: key, sessions: 0, pages: 0, minutes: 0 })
        }
        for (const r of rows) {
          if (r.duration_min < min) continue
          const key = r.started_at.slice(0, 10)
          const b = map.get(key)
          if (b) {
            b.sessions += 1
            b.pages += r.pages_read
            b.minutes += r.duration_min
          }
        }
        return [...map.values()].sort((a, b) => a.day.localeCompare(b.day))
      }
    },

    goals: {
      async list(): Promise<Goal[]> {
        return must(await sb().from('goals').select('*').order('id')) as Goal[]
      },
      async set(type: GoalType, target: number): Promise<Goal> {
        const { data: existing } = await sb().from('goals').select('id').eq('type', type).maybeSingle()
        if (existing) {
          return must(await sb().from('goals').update({ target }).eq('id', existing.id).select().single()) as Goal
        }
        const user_id = await userId()
        return must(await sb().from('goals').insert({ user_id, type, target }).select().single()) as Goal
      },
      async remove(id: number): Promise<void> {
        must(await sb().from('goals').delete().eq('id', id).select())
      }
    },

    notes: {
      async list(bookId: number): Promise<Note[]> {
        return must(
          await sb().from('notes').select('*').eq('book_id', bookId).order('id', { ascending: false })
        ) as Note[]
      },
      async create(bookId: number, type: NoteType, content: string, pageRef: number | null): Promise<Note> {
        const user_id = await userId()
        return must(
          await sb()
            .from('notes')
            .insert({ user_id, book_id: bookId, type, content, page_ref: pageRef })
            .select()
            .single()
        ) as Note
      },
      async update(id: number, patch: NotePatch): Promise<Note> {
        const clean: Record<string, unknown> = {}
        if (patch.type !== undefined) clean.type = patch.type
        if (patch.content !== undefined) clean.content = patch.content
        if (patch.page_ref !== undefined) clean.page_ref = patch.page_ref
        return must(await sb().from('notes').update(clean).eq('id', id).select().single()) as Note
      },
      async remove(id: number): Promise<void> {
        must(await sb().from('notes').delete().eq('id', id).select())
      }
    }
  }
}
