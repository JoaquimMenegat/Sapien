import { contextBridge, ipcRenderer } from 'electron'
import type { ReadDeckApi } from '../shared/types'

// Superfície mínima e explícita exposta ao renderer. Nada de acesso direto ao
// Node ou ao banco — apenas estes métodos, que resolvem via IPC no main process.
const api: ReadDeckApi = {
  health: () => ipcRenderer.invoke('app:health'),
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  account: {
    status: () => ipcRenderer.invoke('account:status'),
    signup: (email, name, password) => ipcRenderer.invoke('account:signup', email, name, password),
    login: (email, password) => ipcRenderer.invoke('account:login', email, password),
    logout: () => ipcRenderer.invoke('account:logout')
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('readdeck', api)
} else {
  // Fallback (contextIsolation desativado) — não usado na config atual.
  // @ts-ignore
  window.readdeck = api
}
