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
  },
  books: {
    list: (status) => ipcRenderer.invoke('books:list', status),
    get: (id) => ipcRenderer.invoke('books:get', id),
    create: (draft) => ipcRenderer.invoke('books:create', draft),
    update: (id, patch) => ipcRenderer.invoke('books:update', id, patch),
    remove: (id) => ipcRenderer.invoke('books:delete', id),
    search: (query) => ipcRenderer.invoke('books:search', query),
    pickCover: () => ipcRenderer.invoke('books:pickCover')
  },
  ai: {
    status: () => ipcRenderer.invoke('ai:status'),
    setKey: (key) => ipcRenderer.invoke('ai:setKey', key),
    setModel: (model) => ipcRenderer.invoke('ai:setModel', model),
    chat: (messages) => ipcRenderer.invoke('ai:chat', messages)
  },
  sessions: {
    create: (bookId, durationMin, pagesRead) =>
      ipcRenderer.invoke('sessions:create', bookId, durationMin, pagesRead),
    recent: (limit) => ipcRenderer.invoke('sessions:recent', limit),
    pace: () => ipcRenderer.invoke('sessions:pace'),
    today: () => ipcRenderer.invoke('sessions:today')
  },
  goals: {
    list: () => ipcRenderer.invoke('goals:list'),
    set: (type, target) => ipcRenderer.invoke('goals:set', type, target),
    remove: (id) => ipcRenderer.invoke('goals:delete', id)
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('readdeck', api)
} else {
  // Fallback (contextIsolation desativado) — não usado na config atual.
  // @ts-ignore
  window.readdeck = api
}
