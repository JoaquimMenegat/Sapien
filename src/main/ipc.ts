// Registro central de handlers IPC. O renderer nunca toca no banco diretamente:
// tudo passa por estes canais, expostos de forma segura pelo preload.

import { ipcMain, app } from 'electron'
import { get, getDbPath } from './db/index'
import { getSetting, setSetting } from './db/settings'
import {
  hasAccount,
  getAccountInfo,
  createAccount,
  verifyLogin,
  upsertGoogleAccount,
  updateProfile
} from './db/account'
import { googleConfigured, setGoogleConfig, googleSignIn } from './googleAuth'
import { listBooks, getBook, createBook, updateBook, deleteBook } from './db/books'
import { searchBooks } from './bookSearch'
import { pickCover } from './covers'
import { aiStatus, chatAboutBooks } from './ai'
import {
  createSession,
  updateSession,
  deleteSession,
  recentSessions,
  computePace,
  todayStats,
  sessionsDaily
} from './db/sessions'
import { listGoals, setGoal, deleteGoal } from './db/goals'
import { listNotes, createNote, updateNote, deleteNote } from './db/notes'
import type {
  AppHealth,
  AuthStatus,
  AuthResult,
  Book,
  BookDraft,
  BookStatus,
  GoogleBookResult,
  AiStatus,
  AiResult,
  ChatMessage,
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
} from '../shared/types'

// Estado de sessão em memória. Por padrão, reabrir o app exige login de novo — a menos
// que o usuário tenha marcado "manter conectado" (persistido em settings/session.remember).
let loggedIn = false

function setRemember(remember: boolean): void {
  setSetting('session.remember', remember ? 'true' : '')
}

function currentStatus(): AuthStatus {
  return {
    hasAccount: hasAccount(),
    loggedIn,
    // Devolve o perfil mesmo antes do login, para a tela escolher o método (senha/Google).
    account: hasAccount() ? getAccountInfo() : null
  }
}

export function registerIpcHandlers(): void {
  // "Manter conectado": restaura a sessão ao abrir o app, se o usuário optou por isso.
  loggedIn = getSetting('session.remember') === 'true' && hasAccount()

  ipcMain.handle('app:health', (): AppHealth => {
    const row = get<{ n: number }>('SELECT COUNT(*) AS n FROM books')
    return {
      ok: true,
      dbPath: getDbPath(),
      bookCount: row?.n ?? 0,
      appVersion: app.getVersion()
    }
  })

  ipcMain.handle('settings:get', (_e, key: string): string | null => getSetting(key))
  ipcMain.handle('settings:set', (_e, key: string, value: string): void => {
    setSetting(key, value)
  })

  // --- Conta / autenticação ---
  ipcMain.handle('account:status', (): AuthStatus => currentStatus())

  ipcMain.handle(
    'account:signup',
    (_e, email: string, name: string, password: string, remember?: boolean): AuthResult => {
      const res = createAccount(email, name, password)
      if (res.ok) {
        loggedIn = true
        setRemember(!!remember)
      }
      return res
    }
  )

  ipcMain.handle(
    'account:login',
    (_e, email: string, password: string, remember?: boolean): AuthResult => {
      const res = verifyLogin(email, password)
      if (res.ok) {
        loggedIn = true
        setRemember(!!remember)
      }
      return res
    }
  )

  ipcMain.handle('account:logout', (): void => {
    loggedIn = false
    setRemember(false)
  })

  ipcMain.handle('account:updateProfile', (_e, name: string, picture: string | null): AuthResult =>
    updateProfile(name, picture)
  )
  ipcMain.handle('account:pickAvatar', (): Promise<string | null> => pickCover())

  ipcMain.handle('account:googleConfig', () => ({ configured: googleConfigured() }))
  ipcMain.handle('account:setGoogleConfig', (_e, clientId: string, clientSecret: string): void =>
    setGoogleConfig(clientId, clientSecret)
  )
  ipcMain.handle('account:googleSignIn', async (_e, remember?: boolean): Promise<AuthResult> => {
    const r = await googleSignIn()
    if (!r.ok || !r.email) return { ok: false, error: r.error ?? 'Falha no login com Google.' }
    const res = upsertGoogleAccount(r.email, r.name ?? '', r.picture ?? '')
    if (res.ok) {
      loggedIn = true
      setRemember(!!remember)
    }
    return res
  })

  // --- Livros ---
  ipcMain.handle('books:list', (_e, status?: BookStatus | 'all'): Book[] => listBooks(status))
  ipcMain.handle('books:get', (_e, id: number): Book | null => getBook(id))
  ipcMain.handle('books:create', (_e, draft: BookDraft): Book => createBook(draft))
  ipcMain.handle('books:update', (_e, id: number, patch: Partial<BookDraft>): Book =>
    updateBook(id, patch)
  )
  ipcMain.handle('books:delete', (_e, id: number): void => deleteBook(id))
  ipcMain.handle('books:search', (_e, query: string): Promise<GoogleBookResult[]> =>
    searchBooks(query)
  )
  ipcMain.handle('books:pickCover', (): Promise<string | null> => pickCover())

  // --- IA "Achar um livro" ---
  ipcMain.handle('ai:status', (): AiStatus => aiStatus())
  ipcMain.handle('ai:setKey', (_e, key: string): void => setSetting('ai.apiKey', key.trim()))
  ipcMain.handle('ai:setModel', (_e, model: string): void => setSetting('ai.model', model))
  ipcMain.handle('ai:chat', (_e, messages: ChatMessage[]): Promise<AiResult> =>
    chatAboutBooks(messages)
  )

  // --- Sessões de leitura (Pomodoro) ---
  ipcMain.handle(
    'sessions:create',
    (_e, bookId: number, durationMin: number, pagesRead: number): ReadingSession =>
      createSession(bookId, durationMin, pagesRead)
  )
  ipcMain.handle('sessions:recent', (_e, limit?: number): SessionWithBook[] =>
    recentSessions(limit)
  )
  ipcMain.handle('sessions:update', (_e, id: number, patch: SessionPatch): ReadingSession =>
    updateSession(id, patch)
  )
  ipcMain.handle('sessions:delete', (_e, id: number): void => deleteSession(id))
  ipcMain.handle('sessions:pace', (): number | null => computePace())
  ipcMain.handle('sessions:today', (): TodayStats => todayStats())
  ipcMain.handle('sessions:daily', (_e, days: number): DailyStat[] => sessionsDaily(days))

  // --- Metas ---
  ipcMain.handle('goals:list', (): Goal[] => listGoals())
  ipcMain.handle('goals:set', (_e, type: GoalType, target: number): Goal => setGoal(type, target))
  ipcMain.handle('goals:delete', (_e, id: number): void => deleteGoal(id))

  // --- Notas ---
  ipcMain.handle('notes:list', (_e, bookId: number): Note[] => listNotes(bookId))
  ipcMain.handle(
    'notes:create',
    (_e, bookId: number, type: NoteType, content: string, pageRef: number | null): Note =>
      createNote(bookId, type, content, pageRef)
  )
  ipcMain.handle('notes:update', (_e, id: number, patch: NotePatch): Note => updateNote(id, patch))
  ipcMain.handle('notes:delete', (_e, id: number): void => deleteNote(id))
}
