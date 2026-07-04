// Metas de leitura. Uma meta por tipo (upsert): livros/ano, livros/mês,
// páginas/dia, minutos/dia. O progresso é calculado no renderer a partir dos
// livros lidos e das sessões — aqui guardamos só o alvo.

import { all, get, insert, run } from './index'
import type { Goal, GoalType } from '../../shared/types'

export function listGoals(): Goal[] {
  return all<Goal>('SELECT * FROM goals ORDER BY id')
}

export function setGoal(type: GoalType, target: number): Goal {
  const t = Math.max(1, Math.round(target))
  const existing = get<{ id: number }>('SELECT id FROM goals WHERE type = ?', [type])
  if (existing) {
    run('UPDATE goals SET target = ? WHERE id = ?', [t, existing.id])
    return get<Goal>('SELECT * FROM goals WHERE id = ?', [existing.id]) as Goal
  }
  const id = insert('INSERT INTO goals (type, target) VALUES (?, ?)', [type, t])
  return get<Goal>('SELECT * FROM goals WHERE id = ?', [id]) as Goal
}

export function deleteGoal(id: number): void {
  run('DELETE FROM goals WHERE id = ?', [id])
}
