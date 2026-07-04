// Registro central de handlers IPC. O renderer nunca toca no banco diretamente:
// tudo passa por estes canais, expostos de forma segura pelo preload.

import { ipcMain, app } from 'electron'
import { get, getDbPath } from './db/index'
import { getSetting, setSetting } from './db/settings'
import type { AppHealth } from '../shared/types'

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

  ipcMain.handle('settings:get', (_e, key: string): string | null => {
    return getSetting(key)
  })

  ipcMain.handle('settings:set', (_e, key: string, value: string): void => {
    setSetting(key, value)
  })
}
