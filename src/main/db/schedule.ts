// Agenda de leitura: grade semanal recorrente (dia da semana + horário + livro).

import { all, get, insert, run } from './index'
import type { ScheduleSlot, ScheduleSlotWithBook, ScheduleDraft } from '../../shared/types'
import type { SqlValue } from 'sql.js'

const WRITABLE = ['book_id', 'weekday', 'start_min', 'duration_min', 'note'] as const

export function listSlots(): ScheduleSlotWithBook[] {
  return all<ScheduleSlotWithBook>(
    `SELECT s.*, b.title AS book_title
       FROM schedule_slots s
       LEFT JOIN books b ON b.id = s.book_id
      ORDER BY s.weekday, s.start_min`
  )
}

export function createSlot(draft: ScheduleDraft): ScheduleSlot {
  const id = insert(
    'INSERT INTO schedule_slots (book_id, weekday, start_min, duration_min, note) VALUES (?, ?, ?, ?, ?)',
    [
      draft.book_id ?? null,
      draft.weekday,
      draft.start_min,
      draft.duration_min,
      draft.note ?? null
    ]
  )
  return get<ScheduleSlot>('SELECT * FROM schedule_slots WHERE id = ?', [id]) as ScheduleSlot
}

export function updateSlot(id: number, patch: Partial<ScheduleDraft>): ScheduleSlot {
  const keys = Object.keys(patch).filter((k) => (WRITABLE as readonly string[]).includes(k))
  if (keys.length > 0) {
    const setClause = keys.map((k) => `"${k}" = ?`).join(', ')
    const params = keys.map((k) => (patch as Record<string, SqlValue>)[k] ?? null)
    run(`UPDATE schedule_slots SET ${setClause} WHERE id = ?`, [...params, id])
  }
  return get<ScheduleSlot>('SELECT * FROM schedule_slots WHERE id = ?', [id]) as ScheduleSlot
}

export function deleteSlot(id: number): void {
  run('DELETE FROM schedule_slots WHERE id = ?', [id])
}
