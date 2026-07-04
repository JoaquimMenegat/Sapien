import { useEffect, useState } from 'react'
import { BookOpen, Check, Clock, Gauge } from 'lucide-react'
import type { Book } from '../../../../shared/types'
import { useBooks } from '../../store/books'
import { BookCover, ReadingProgress } from '../library/BookBits'

const today = (): string => new Date().toISOString().slice(0, 10)

function fmtTime(min: number | null): string | null {
  if (min == null) return null
  if (min < 1) return 'menos de 1 min'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

function ReadingCard({ book, pace }: { book: Book; pace: number }): JSX.Element {
  const saveBook = useBooks((s) => s.saveBook)
  const [page, setPage] = useState(String(book.current_page))
  const [busy, setBusy] = useState(false)

  const total = book.total_pages ?? null
  const current = book.current_page
  const remaining = total ? Math.max(0, total - current) : null
  const timeMin = remaining != null && pace > 0 ? Math.round((remaining / pace) * 60) : null
  const done = total != null && current >= total

  async function updatePage(): Promise<void> {
    const n = Math.max(0, parseInt(page, 10) || 0)
    const clamped = total ? Math.min(n, total) : n
    setBusy(true)
    await saveBook(book.id, { current_page: clamped })
    setBusy(false)
  }

  async function finish(): Promise<void> {
    setBusy(true)
    await saveBook(book.id, {
      status: 'lido',
      current_page: total ?? current,
      finished_at: book.finished_at ?? today()
    })
    setBusy(false)
  }

  return (
    <div className="card flex gap-4 p-4">
      <BookCover
        url={book.cover_url}
        title={book.title}
        className="h-36 w-24 shrink-0 rounded-lg border border-edge"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate font-serif text-lg font-semibold text-ink">{book.title}</p>
        {book.authors && <p className="truncate text-sm text-ink-soft">{book.authors}</p>}

        {total ? (
          <div className="mt-3 space-y-2">
            <ReadingProgress current={current} total={total} />
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
              <span>
                Faltam <span className="font-semibold text-ink">{remaining}</span>{' '}
                {remaining === 1 ? 'página' : 'páginas'}
              </span>
              {timeMin != null && remaining! > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} className="text-ink-faint" /> ~{fmtTime(timeMin)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-faint">
            Defina as páginas totais deste livro (na Biblioteca) para ver quanto falta.
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          <label className="text-xs text-ink-soft">Página atual</label>
          <input
            type="number"
            min={0}
            max={total ?? undefined}
            value={page}
            onChange={(e) => setPage(e.target.value)}
            className="field h-9 w-24 py-1"
          />
          <button onClick={updatePage} disabled={busy} className="btn-ghost h-9 py-1">
            Atualizar
          </button>
          {done && (
            <button onClick={finish} disabled={busy} className="btn-primary h-9 py-1">
              <Check size={15} /> Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ReadingView(): JSX.Element {
  const books = useBooks((s) => s.books)
  const load = useBooks((s) => s.load)
  const [pace, setPace] = useState(40)

  useEffect(() => {
    void load()
    void window.readdeck.getSetting('reading.pace').then((v) => {
      const n = v ? parseInt(v, 10) : NaN
      if (Number.isFinite(n) && n > 0) setPace(n)
    })
  }, [load])

  function onPace(v: string): void {
    const n = Math.max(1, parseInt(v, 10) || 0)
    setPace(n)
    void window.readdeck.setSetting('reading.pace', String(n))
  }

  const reading = books.filter((b) => b.status === 'lendo')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[15px] leading-relaxed text-ink-soft">
          Seus livros em andamento, com quanto falta em páginas e tempo estimado.
        </p>
        <label className="inline-flex items-center gap-2 rounded-lg border border-edge bg-surface px-3 py-1.5 text-sm">
          <Gauge size={15} className="text-ink-faint" />
          <span className="text-ink-soft">Ritmo</span>
          <input
            type="number"
            min={1}
            value={pace}
            onChange={(e) => onPace(e.target.value)}
            className="w-14 bg-transparent text-right font-semibold text-ink outline-none"
          />
          <span className="text-ink-faint">pág/h</span>
        </label>
      </div>

      {reading.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-edge py-16 text-center">
          <BookOpen size={28} className="text-ink-faint" />
          <p className="text-sm text-ink-soft">
            Nenhum livro em leitura. Marque um livro como <span className="font-medium">Lendo</span>{' '}
            na Biblioteca para acompanhá-lo aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {reading.map((b) => (
            <ReadingCard key={b.id} book={b} pace={pace} />
          ))}
        </div>
      )}

      <p className="text-xs text-ink-faint">
        O tempo é estimado pelo seu ritmo. Quando o Pomodoro (Fase 3) estiver pronto, o ritmo passa
        a ser medido automaticamente pelas suas sessões.
      </p>
    </div>
  )
}
