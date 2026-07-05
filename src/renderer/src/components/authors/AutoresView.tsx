import { useEffect, useMemo, useState } from 'react'
import { Users, ArrowLeft, ChevronRight } from 'lucide-react'
import type { Book } from '../../../../shared/types'
import { useBooks } from '../../store/books'
import { BookCover, StatusBadge } from '../library/BookBits'
import { BookDetailModal } from '../library/BookDetailModal'

const PALETTE = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899',
  '#14b8a6', '#f97316', '#6366f1', '#ef4444', '#84cc16', '#06b6d4', '#a855f7'
]

type Scope = 'lidos' | 'todos'

function authorsOf(b: Book): string[] {
  return b.authors
    ? b.authors.split(',').map((s) => s.trim()).filter(Boolean)
    : []
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }): JSX.Element {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: `${color}14`, borderColor: `${color}33` }}>
      <p className="text-xs font-medium" style={{ color }}>{label}</p>
      <p className="mt-1 truncate font-serif text-2xl font-semibold text-ink" title={String(value)}>{value}</p>
    </div>
  )
}

export function AutoresView(): JSX.Element {
  const books = useBooks((s) => s.books)
  const load = useBooks((s) => s.load)
  const [scope, setScope] = useState<Scope>('lidos')
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<Book | null>(null)

  useEffect(() => {
    void load()
  }, [load])

  const matches = useMemo(
    () => books.filter((b) => scope === 'todos' || b.status === 'lido'),
    [books, scope]
  )

  const rows = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of matches) for (const a of authorsOf(b)) map.set(a, (map.get(a) ?? 0) + 1)
    return [...map.entries()]
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count || a.author.localeCompare(b.author))
  }, [matches])

  const totalMentions = rows.reduce((s, r) => s + r.count, 0)
  const authorBooks = useMemo(
    () => (selected ? matches.filter((b) => authorsOf(b).includes(selected)) : []),
    [matches, selected]
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {selected ? (
          <button onClick={() => setSelected(null)} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
            <ArrowLeft size={15} /> Todos os autores
          </button>
        ) : (
          <p className="max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Os autores que você leu e quantos livros de cada um. Clique num autor para ver os livros.
          </p>
        )}
        <div className="flex items-center gap-0.5 rounded-lg border border-edge bg-surface p-0.5 text-sm">
          {(['lidos', 'todos'] as Scope[]).map((s) => (
            <button
              key={s}
              onClick={() => { setScope(s); setSelected(null) }}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${scope === s ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'}`}
            >
              {s === 'lidos' ? 'Lidos' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <div>
          <h2 className="mb-4 font-serif text-2xl font-semibold text-ink">{selected}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
            {authorBooks.map((b) => (
              <button key={b.id} onClick={() => setDetail(b)} className="group text-left">
                <BookCover url={b.cover_url} title={b.title} className="aspect-[2/3] w-full rounded-xl border border-edge transition-transform group-hover:-translate-y-0.5" />
                <p className="mt-2 truncate text-sm font-medium text-ink">{b.title}</p>
                <div className="mt-1"><StatusBadge status={b.status} /></div>
              </button>
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-edge py-16 text-center">
          <Users size={28} className="text-ink-faint" />
          <p className="text-sm text-ink-soft">
            {scope === 'lidos'
              ? 'Você ainda não marcou livros como "Lido". Marque leituras concluídas (ou veja "Todos").'
              : 'Adicione livros com autor para ver aqui.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricCard label="Autores" value={rows.length} color="#8b5cf6" />
            <MetricCard label={scope === 'lidos' ? 'Livros lidos' : 'Livros'} value={matches.filter((b) => authorsOf(b).length > 0).length} color="#3b82f6" />
            <MetricCard label="Mais lido" value={rows[0].author} color="#10b981" />
          </div>

          <div className="card p-5">
            <h2 className="mb-4 font-serif text-lg font-semibold text-ink">Por autor</h2>
            <div className="space-y-3.5">
              {rows.map((r, i) => {
                const color = PALETTE[i % PALETTE.length]
                const share = totalMentions ? Math.round((r.count / totalMentions) * 100) : 0
                return (
                  <button key={r.author} onClick={() => setSelected(r.author)} className="block w-full text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        <span className="truncate text-sm font-medium text-ink">{r.author}</span>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-ink">
                        {r.count} {r.count === 1 ? 'livro' : 'livros'}
                        <ChevronRight size={14} className="text-ink-faint" />
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink/[0.06]">
                      <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: color }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      <BookDetailModal book={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
