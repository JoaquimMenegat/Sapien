// Notas, trechos e callouts por livro.

import { all, get, insert, run } from './index'
import type { Note, NoteType, NotePatch } from '../../shared/types'
import type { SqlValue } from 'sql.js'

const WRITABLE = ['type', 'content', 'page_ref'] as const

export function listNotes(bookId: number): Note[] {
  return all<Note>('SELECT * FROM notes WHERE book_id = ? ORDER BY datetime(created_at) DESC', [
    bookId
  ])
}

export function createNote(
  bookId: number,
  type: NoteType,
  content: string,
  pageRef: number | null
): Note {
  const id = insert(
    'INSERT INTO notes (book_id, type, content, page_ref) VALUES (?, ?, ?, ?)',
    [bookId, type, content, pageRef]
  )
  return get<Note>('SELECT * FROM notes WHERE id = ?', [id]) as Note
}

export function updateNote(id: number, patch: NotePatch): Note {
  const keys = Object.keys(patch).filter((k) => (WRITABLE as readonly string[]).includes(k))
  if (keys.length > 0) {
    const setClause = keys.map((k) => `"${k}" = ?`).join(', ')
    const params = keys.map((k) => (patch as Record<string, SqlValue>)[k] ?? null)
    run(`UPDATE notes SET ${setClause} WHERE id = ?`, [...params, id])
  }
  return get<Note>('SELECT * FROM notes WHERE id = ?', [id]) as Note
}

export function deleteNote(id: number): void {
  run('DELETE FROM notes WHERE id = ?', [id])
}
