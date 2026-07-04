import { create } from 'zustand'
import type { Goal, GoalType } from '../../../shared/types'

interface GoalsState {
  goals: Goal[]
  load: () => Promise<void>
  setGoal: (type: GoalType, target: number) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useGoals = create<GoalsState>((set, get) => ({
  goals: [],
  load: async () => set({ goals: await window.readdeck.goals.list() }),
  setGoal: async (type, target) => {
    await window.readdeck.goals.set(type, target)
    await get().load()
  },
  remove: async (id) => {
    await window.readdeck.goals.remove(id)
    await get().load()
  }
}))
