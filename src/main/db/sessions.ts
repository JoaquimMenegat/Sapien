// Sessões de leitura (alimentadas pelo Pomodoro): páginas lidas + duração.
// Cada sessão avança o progresso do livro e alimenta o cálculo de ritmo (pág/h).

import { all, get, insert, run } from './index'
import { getBook, updateBook } from './books'
import { getSetting } from './settings'
import type { SqlValue } from 'sql.js'
import type {
  BookDraft,
  ReadingSession,
  SessionWithBook,
  SessionPatch,
  TodayStats,
  DailyStat
} from '../../shared/types'

const todayStr = (): string => new Date().toISOString().slice(0, 10)

// Tempo mínimo (min) para uma sessão "contar" na sequência/estatísticas de hoje.
// 0 (padrão) = conta todas. Configurável na Personalização.
function minSessionMin(): number {
  const v = parseInt(getSetting('reading.minSessionMin') ?? '', 10)
  return Number.isFinite(v) && v > 0 ? v : 0
}

export function createSession(
  bookId: number,
  durationMin: number,
  pagesRead: number
): ReadingSession {
  const id = insert(
    `INSERT INTO reading_sessions (book_id, ended_at, duration_min, pages_read)
     VALUES (?, datetime('now'), ?, ?)`,
    [bookId, Math.max(0, Math.round(durationMin)), Math.max(0, Math.round(pagesRead))]
  )

  // Avança o progresso do livro e ajusta status/início quando fizer sentido.
  const book = getBook(bookId)
  if (book && pagesRead > 0) {
    const next = book.total_pages
      ? Math.min(book.total_pages, book.current_page + pagesRead)
      : book.current_page + pagesRead
    const patch: Partial<BookDraft> = { current_page: next }
    if (book.status === 'wishlist' || book.status === 'fila') {
      patch.status = 'lendo'
      if (!book.started_at) patch.started_at = todayStr()
    }
    updateBook(bookId, patch)
  }

  return get<ReadingSession>('SELECT * FROM reading_sessions WHERE id = ?', [id]) as ReadingSession
}

// Edita um registro de sessão (livro/páginas/duração). Não reajusta o progresso
// do livro — a página atual continua editável direto no cadastro do livro.
export function updateSession(id: number, patch: SessionPatch): ReadingSession {
  const fields: string[] = []
  const params: SqlValue[] = []
  if (patch.book_id != null) {
    fields.push('book_id = ?')
    params.push(patch.book_id)
  }
  if (patch.duration_min != null) {
    fields.push('duration_min = ?')
    params.push(Math.max(0, Math.round(patch.duration_min)))
  }
  if (patch.pages_read != null) {
    fields.push('pages_read = ?')
    params.push(Math.max(0, Math.round(patch.pages_read)))
  }
  if (fields.length > 0) {
    run(`UPDATE reading_sessions SET ${fields.join(', ')} WHERE id = ?`, [...params, id])
  }
  return get<ReadingSession>('SELECT * FROM reading_sessions WHERE id = ?', [id]) as ReadingSession
}

export function deleteSession(id: number): void {
  run('DELETE FROM reading_sessions WHERE id = ?', [id])
}

export function recentSessions(limit = 20): SessionWithBook[] {
  return all<SessionWithBook>(
    `SELECT s.*, COALESCE(b.title, '(livro removido)') AS book_title
     FROM reading_sessions s
     LEFT JOIN books b ON b.id = s.book_id
     ORDER BY datetime(s.started_at) DESC
     LIMIT ?`,
    [limit]
  )
}

export function computePace(): number | null {
  const row = get<{ pages: number | null; mins: number | null }>(
    `SELECT SUM(pages_read) AS pages, SUM(duration_min) AS mins
     FROM reading_sessions WHERE pages_read > 0 AND duration_min > 0`
  )
  if (!row || !row.mins || !row.pages) return null
  const hours = row.mins / 60
  if (hours <= 0) return null
  return Math.round(row.pages / hours)
}

export function sessionsDaily(days: number): DailyStat[] {
  const n = Math.max(1, Math.min(366, Math.round(days)))
  const min = minSessionMin()
  // CTE recursiva gera a série de dias; LEFT JOIN preenche zeros nos dias vazios.
  // Só contam sessões com duração >= mínimo configurado.
  return all<DailyStat>(
    `WITH RECURSIVE d(day) AS (
       SELECT date('now', ?)
       UNION ALL SELECT date(day, '+1 day') FROM d WHERE day < date('now')
     )
     SELECT d.day AS day,
            COUNT(s.id) AS sessions,
            COALESCE(SUM(s.pages_read), 0) AS pages,
            COALESCE(SUM(s.duration_min), 0) AS minutes
     FROM d LEFT JOIN reading_sessions s
       ON date(s.started_at) = d.day AND s.duration_min >= ?
     GROUP BY d.day
     ORDER BY d.day`,
    [`-${n - 1} days`, min]
  )
}

export function todayStats(): TodayStats {
  const row = get<{ n: number; pages: number; mins: number }>(
    `SELECT COUNT(*) AS n, COALESCE(SUM(pages_read),0) AS pages, COALESCE(SUM(duration_min),0) AS mins
     FROM reading_sessions WHERE date(started_at) = date('now') AND duration_min >= ?`,
    [minSessionMin()]
  )
  return { sessions: row?.n ?? 0, pages: row?.pages ?? 0, minutes: row?.mins ?? 0 }
}
