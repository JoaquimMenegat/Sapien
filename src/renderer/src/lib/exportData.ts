// Exportar dados (recurso Premium): backup completo em JSON e o acervo em CSV.
// Junta tudo via a ponte window.readdeck (mesma no desktop e na web) e dispara o
// download no navegador — nada sai do dispositivo além do arquivo que o usuário salva.
import type { Book } from '../../../shared/types'

function triggerDownload(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Reúne todo o acervo, sessões, metas e notas do usuário. */
async function gatherAll(): Promise<Record<string, unknown>> {
  const [books, goals, sessions] = await Promise.all([
    window.readdeck.books.list('all'),
    window.readdeck.goals.list(),
    window.readdeck.sessions.recent(100_000)
  ])
  const noteLists = await Promise.all(books.map((b) => window.readdeck.notes.list(b.id)))
  return {
    app: 'Sapien',
    exportedAt: new Date().toISOString(),
    counts: { books: books.length, sessions: sessions.length, goals: goals.length },
    books,
    sessions,
    goals,
    notes: noteLists.flat()
  }
}

/** Backup completo (livros + sessões + metas + notas) em um único JSON. */
export async function exportJSON(): Promise<void> {
  const data = await gatherAll()
  triggerDownload(`sapien-backup-${stamp()}.json`, JSON.stringify(data, null, 2), 'application/json')
}

function csvCell(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const BOOK_CSV_COLS: { key: keyof Book; label: string }[] = [
  { key: 'title', label: 'Título' },
  { key: 'authors', label: 'Autores' },
  { key: 'status', label: 'Status' },
  { key: 'current_page', label: 'Página atual' },
  { key: 'total_pages', label: 'Total de páginas' },
  { key: 'genres', label: 'Gêneros' },
  { key: 'publisher', label: 'Editora' },
  { key: 'language', label: 'Idioma' },
  { key: 'format', label: 'Formato' },
  { key: 'rating', label: 'Nota' },
  { key: 'started_at', label: 'Início' },
  { key: 'finished_at', label: 'Conclusão' },
  { key: 'isbn', label: 'ISBN' }
]

/** Acervo (livros) como planilha CSV — abre no Excel/Google Sheets. */
export async function exportBooksCSV(): Promise<void> {
  const books = await window.readdeck.books.list('all')
  const header = BOOK_CSV_COLS.map((c) => c.label).join(',')
  const rows = books.map((b) => BOOK_CSV_COLS.map((c) => csvCell(b[c.key])).join(','))
  // BOM (﻿) para o Excel exibir os acentos corretamente.
  const csv = '﻿' + [header, ...rows].join('\r\n')
  triggerDownload(`sapien-acervo-${stamp()}.csv`, csv, 'text/csv;charset=utf-8')
}
