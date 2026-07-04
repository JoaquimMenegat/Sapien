// CRUD de livros sobre a tabela books (sql.js).

import { all, get, insert, run } from './index'
import type { Book, BookDraft, BookStatus } from '../../shared/types'
import type { SqlValue } from 'sql.js'

// Colunas que o usuário pode gravar (whitelist — evita injeção de coluna no update).
const WRITABLE = [
  'title',
  'subtitle',
  'authors',
  'cover_url',
  'isbn',
  'total_pages',
  'current_page',
  'synopsis',
  'publisher',
  'language',
  'format',
  'genres',
  'status',
  'rating',
  'public_rating',
  'ratings_count',
  'started_at',
  'finished_at',
  'verdict',
  'google_books_id'
] as const

export function listBooks(status?: BookStatus | 'all'): Book[] {
  if (!status || status === 'all') {
    return all<Book>('SELECT * FROM books ORDER BY datetime(updated_at) DESC')
  }
  return all<Book>('SELECT * FROM books WHERE status = ? ORDER BY datetime(updated_at) DESC', [
    status
  ])
}

export function getBook(id: number): Book | null {
  return get<Book>('SELECT * FROM books WHERE id = ?', [id])
}

export function createBook(draft: BookDraft): Book {
  const values: Record<string, SqlValue> = {
    title: draft.title,
    subtitle: draft.subtitle ?? null,
    authors: draft.authors ?? null,
    cover_url: draft.cover_url ?? null,
    isbn: draft.isbn ?? null,
    total_pages: draft.total_pages ?? null,
    current_page: draft.current_page ?? 0,
    synopsis: draft.synopsis ?? null,
    publisher: draft.publisher ?? null,
    language: draft.language ?? null,
    format: draft.format ?? null,
    genres: draft.genres ?? null,
    status: draft.status ?? 'wishlist',
    rating: draft.rating ?? null,
    public_rating: draft.public_rating ?? null,
    ratings_count: draft.ratings_count ?? null,
    started_at: draft.started_at ?? null,
    finished_at: draft.finished_at ?? null,
    verdict: draft.verdict ?? null,
    google_books_id: draft.google_books_id ?? null
  }
  const cols = Object.keys(values)
  const placeholders = cols.map(() => '?').join(', ')
  const id = insert(
    `INSERT INTO books (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
    cols.map((c) => values[c])
  )
  return getBook(id) as Book
}

export function updateBook(id: number, patch: Partial<BookDraft>): Book {
  const keys = Object.keys(patch).filter((k) => (WRITABLE as readonly string[]).includes(k))
  if (keys.length > 0) {
    const setClause = keys.map((k) => `"${k}" = ?`).join(', ')
    const params = keys.map((k) => (patch as Record<string, SqlValue>)[k] ?? null)
    run(`UPDATE books SET ${setClause}, updated_at = datetime('now') WHERE id = ?`, [
      ...params,
      id
    ])
  }
  return getBook(id) as Book
}

export function deleteBook(id: number): void {
  run('DELETE FROM books WHERE id = ?', [id])
}
