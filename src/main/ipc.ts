// Registro central de handlers IPC. O renderer nunca toca no banco diretamente:
// tudo passa por estes canais, expostos de forma segura pelo preload.

import { ipcMain, app } from 'electron'
import { get, getDbPath } from './db/index'
import { getSetting, setSetting } from './db/settings'
import { hasAccount, getAccountInfo, createAccount, verifyLogin } from './db/account'
import { listBooks, getBook, createBook, updateBook, deleteBook } from './db/books'
import { searchBooks } from './bookSearch'
import { pickCover } from './covers'
import type {
  AppHealth,
  AuthStatus,
  AuthResult,
  Book,
  BookDraft,
  BookStatus,
  GoogleBookResult
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
}
