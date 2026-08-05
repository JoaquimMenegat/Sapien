import { create } from 'zustand'
import type { ScheduleSlotWithBook, ScheduleDraft } from '../../../shared/types'

interface ScheduleState {
  slots: ScheduleSlotWithBook[]
  loading: boolean
  /** Mensagem de erro amigável (ex.: tabela ainda não criada no Supabase). */
  error: string | null
  load: () => Promise<void>
  add: (draft: ScheduleDraft) => Promise<void>
  edit: (id: number, patch: Partial<ScheduleDraft>) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useSchedule = create<ScheduleState>((set, get) => ({
  slots: [],
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true })
    try {
      set({ slots: await window.readdeck.schedule.list(), error: null })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      set({
        slots: [],
        error: /schedule_slots|relation|does not exist/i.test(msg)
          ? 'A agenda ainda não está configurada no servidor.'
          : 'Não foi possível carregar a agenda.'
      })
    } finally {
      set({ loading: false })
    }
  },
  add: async (draft) => {
    await window.readdeck.schedule.create(draft)
    await get().load()
  },
  edit: async (id, patch) => {
    await window.readdeck.schedule.update(id, patch)
    await get().load()
  },
  remove: async (id) => {
    await window.readdeck.schedule.remove(id)
    await get().load()
  }
}))
