// Registro central de handlers IPC. O renderer nunca toca no banco diretamente:
// tudo passa por estes canais, expostos de forma segura pelo preload.

import { ipcMain, app } from 'electron'
import { get, getDbPath } from './db/index'
import { getSetting, setSetting } from './db/settings'
import { hasAccount, getAccountInfo, createAccount, verifyLogin } from './db/account'
import { listBooks, getBook, createBook, updateBook, deleteBook } from './db/books'
import { searchBooks } from './bookSearch'
import { pickCover } from './covers'
import { aiStatus, chatAboutBooks } from './ai'
import { createSession, recentSessions, computePace, todayStats, sessionsDaily } from './db/sessions'
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
  TodayStats,
  DailyStat,
  Goal,
  GoalType,
  Note,
  NoteType,
  NotePatch
} from '../shared/types'

// Estado de sessão: vive só em memória. Ao reabrir o app, exige login de novo.
let loggedIn = false

function currentStatus(): AuthStatus {
  return {
    hasAccount: hasAccount(),
    loggedIn,
    account: loggedIn ? getAccountInfo() : null
  }
}

export function registerIpcHandlers(): void {
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
    (_e, email: string, name: string, password: string): AuthResult => {
      const res = createAccount(email, name, password)
      if (res.ok) loggedIn = true
      return res
    }
  )

  ipcMain.handle('account:login', (_e, email: string, password: string): AuthResult => {
    const res = verifyLogin(email, password)
    if (res.ok) loggedIn = true
    return res
  })

  ipcMain.handle('account:logout', (): void => {
    loggedIn = false
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
