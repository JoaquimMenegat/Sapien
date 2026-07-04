import { create } from 'zustand'
import type { AiStatus, ChatMessage } from '../../../shared/types'
import { cleanErrorMessage } from '../lib/errors'

interface AiState {
  messages: ChatMessage[]
  sending: boolean
  status: AiStatus | null
  error: string | null

  refreshStatus: () => Promise<void>
  setKey: (key: string) => Promise<void>
  setModel: (model: string) => Promise<void>
  send: (text: string) => Promise<void>
  clear: () => void
}

export const useAi = create<AiState>((set, get) => ({
  messages: [],
  sending: false,
  status: null,
  error: null,

  refreshStatus: async () => {
    const status = await window.readdeck.ai.status()
    set({ status })
  },
  setKey: async (key) => {
    await window.readdeck.ai.setKey(key)
    await get().refreshStatus()
  },
  setModel: async (model) => {
    await window.readdeck.ai.setModel(model)
    await get().refreshStatus()
  },

  send: async (text) => {
    const trimmed = text.trim()
    if (!trimmed || get().sending) return
    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    const history = [...get().messages, userMsg]
    set({ messages: history, sending: true, error: null })
    try {
      const res = await window.readdeck.ai.chat(history)
      if (res.ok && res.text) {
        set({ messages: [...history, { role: 'assistant', content: res.text }], sending: false })
      } else {
        set({ error: res.error ?? 'Falha ao consultar a IA.', sending: false })
      }
    } catch (err) {
      set({ error: cleanErrorMessage(err), sending: false })
    }
  },

  clear: () => set({ messages: [], error: null })
}))
