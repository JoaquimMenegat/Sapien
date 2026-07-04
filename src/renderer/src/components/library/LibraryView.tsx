import { useEffect, useMemo, useState } from 'react'
import { LayoutGrid, List as ListIcon, Table2, Plus, BookMarked } from 'lucide-react'
import type { Book } from '../../../../shared/types'
import { useBooks, type StatusFilter, type ViewMode } from '../../store/books'
import { STATUS_ORDER, STATUS_META, FORMAT_META } from './constants'
import { BookCover, StatusBadge, StarRating } from './BookBits'
import { AddBookModal } from './AddBookModal'
import { BookDetailModal } from './BookDetailModal'

function progress(b: Book): number {
  if (!b.total_pages || b.total_pages <= 0) return 0
  return Math.min(100, Math.round((b.current_page / b.total_pages) * 100))
}

function ProgressBar({ value }: { value: number }): JSX.Element {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.08]">
      <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
    </div>
  )
}

const VIEWS: { id: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
  { id: 'grade', icon: LayoutGrid, label: 'Grade' },
  { id: 'lista', icon: ListIcon, label: 'Lista' },
  { id: 'tabela', icon: Table2, label: 'Tabela' }
]

export function LibraryView(): JSX.Element {
  const { books, loading, filter, view, load, setFilter, setView } = useBooks()
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState<Book | null>(null)

  useEffect(() => {
    void load()
  }, [load])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: books.length }
    for (const s of STATUS_ORDER) c[s] = books.filter((b) => b.status === s).length
    return c
  }, [books])

  const filtered = useMemo(
    () => (filter === 'all' ? books : books.filter((b) => b.status === filter)),
    [books, filter]
  )

  const tabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    ...STATUS_ORDER.map((s) => ({ id: s as StatusFilter, label: STATUS_META[s].label }))
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === t.id ? 'bg-ink/[0.08] text-ink' : 'text-ink-soft hover:bg-ink/[0.04]'
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-ink-faint">{counts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-edge bg-surface p-0.5">
            {VIEWS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                title={label}
                aria-label={label}
                className={`rounded-md p-1.5 transition-colors ${
                  view === id ? 'bg-accent text-white' : 'text-ink-faint hover:text-ink'
                }`}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
          <button onClick={() => setAdding(true)} className="btn-primary">
            <Plus size={16} /> Adicionar livro
          </button>
        </div>
      </div>

      {loading && books.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-faint">Carregando acervo…</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-edge py-16 text-center">
          <BookMarked size={28} className="text-ink-faint" />
          <p className="text-sm text-ink-soft">
            {books.length === 0
              ? 'Sua estante está vazia. Adicione seu primeiro livro!'
              : 'Nenhum livro neste filtro.'}
          </p>
          {books.length === 0 && (
            <button onClick={() => setAdding(true)} className="btn-primary">
              <Plus size={16} /> Adicionar livro
            </button>
          )}
        </div>
      ) : view === 'grade' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
          {filtered.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelected(b)}
              className="group text-left"
            >
              <BookCover
                url={b.cover_url}
                title={b.title}
                className="aspect-[2/3] w-full rounded-xl border border-edge transition-transform group-hover:-translate-y-0.5"
              />
              <div className="mt-2 space-y-1">
                <p className="truncate text-sm font-medium text-ink">{b.title}</p>
                {b.authors && <p className="truncate text-xs text-ink-faint">{b.authors}</p>}
                <StatusBadge status={b.status} />
                {b.status === 'lendo' && b.total_pages ? <ProgressBar value={progress(b)} /> : null}
              </div>
            </button>
          ))}
        </div>
      ) : view === 'lista' ? (
        <div className="space-y-1.5">
          {filtered.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelected(b)}
              className="flex w-full items-center gap-3 rounded-xl border border-edge bg-surface p-2.5 text-left transition-colors hover:bg-ink/[0.03]"
            >
              <BookCover url={b.cover_url} title={b.title} className="h-16 w-11 shrink-0 rounded border border-edge" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{b.title}</p>
                {b.authors && <p className="truncate text-xs text-ink-soft">{b.authors}</p>}
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={b.status} />
                  <StarRating value={b.rating} />
                </div>
              </div>
              <div className="w-28 shrink-0 text-right text-xs text-ink-faint">
                {b.total_pages ? `${b.current_page}/${b.total_pages} p.` : ''}
                {b.format ? <div>{FORMAT_META[b.format]}</div> : null}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-edge">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge bg-surface text-left text-xs text-ink-faint">
                <th className="px-3 py-2 font-medium">Título</th>
                <th className="px-3 py-2 font-medium">Autor</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Progresso</th>
                <th className="px-3 py-2 font-medium">Nota</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setSelected(b)}
                  className="cursor-pointer border-b border-edge last:border-0 hover:bg-ink/[0.03]"
                >
                  <td className="px-3 py-2 font-medium text-ink">{b.title}</td>
                  <td className="px-3 py-2 text-ink-soft">{b.authors ?? '—'}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-3 py-2 text-ink-soft">
                    {b.total_pages ? `${progress(b)}%` : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <StarRating value={b.rating} size={12} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddBookModal open={adding} onClose={() => setAdding(false)} />
      <BookDetailModal book={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
