import { useEffect, useMemo, useState } from 'react'
import { Tags } from 'lucide-react'
import type { Book } from '../../../../shared/types'
import { useBooks } from '../../store/books'

// Paleta viva para os gêneros (estilo dashboard), cíclica por índice.
const PALETTE = [
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#ef4444',
  '#84cc16',
  '#06b6d4',
  '#a855f7',
  '#eab308',
  '#f43f5e'
]

type Scope = 'lidos' | 'todos'

function genresOf(b: Book): string[] {
  return b.genres
    ? b.genres
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []
}

function aggregate(books: Book[], onlyRead: boolean): { genre: string; count: number }[] {
  const map = new Map<string, number>()
  for (const b of books) {
    if (onlyRead && b.status !== 'lido') continue
    for (const g of genresOf(b)) map.set(g, (map.get(g) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre))
}

function MetricCard({
  label,
  value,
  color
}: {
  label: string
  value: string | number
  color: string
}): JSX.Element {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: `${color}14`, borderColor: `${color}33` }}
    >
      <p className="text-xs font-medium" style={{ color }}>
        {label}
      </p>
      <p className="mt-1 truncate font-serif text-2xl font-semibold text-ink" title={String(value)}>
        {value}
      </p>
    </div>
  )
}

export function GenresView(): JSX.Element {
  const books = useBooks((s) => s.books)
  const load = useBooks((s) => s.load)
  const [scope, setScope] = useState<Scope>('lidos')

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => aggregate(books, scope === 'lidos'), [books, scope])
  const totalMentions = rows.reduce((s, r) => s + r.count, 0)
  const booksWithGenre = useMemo(
    () =>
      books.filter(
        (b) => (scope === 'todos' || b.status === 'lido') && genresOf(b).length > 0
      ).length,
    [books, scope]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[15px] leading-relaxed text-ink-soft">
          Quantos livros você tem em cada gênero. Uma forma rápida de ver onde suas leituras se
          concentram.
        </p>
        <div className="flex items-center gap-0.5 rounded-lg border border-edge bg-surface p-0.5 text-sm">
          {(['lidos', 'todos'] as Scope[]).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                scope === s ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {s === 'lidos' ? 'Lidos' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-edge py-16 text-center">
          <Tags size={28} className="text-ink-faint" />
          <p className="text-sm text-ink-soft">
            {scope === 'lidos'
              ? 'Você ainda não marcou livros como "Lido" com gêneros. Marque leituras concluídas (ou veja "Todos").'
              : 'Adicione gêneros aos seus livros para ver a distribuição aqui.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricCard label="Gêneros" value={rows.length} color="#10b981" />
            <MetricCard
              label={scope === 'lidos' ? 'Livros lidos' : 'Livros'}
              value={booksWithGenre}
              color="#3b82f6"
            />
            <MetricCard label="Mais frequente" value={rows[0].genre} color="#8b5cf6" />
          </div>

          <div className="card p-5">
            <h2 className="mb-4 font-serif text-lg font-semibold text-ink">Por gênero</h2>
            <div className="space-y-3.5">
              {rows.map((r, i) => {
                const color = PALETTE[i % PALETTE.length]
                const share = totalMentions ? Math.round((r.count / totalMentions) * 100) : 0
                return (
                  <div key={r.genre}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate text-sm font-medium text-ink">{r.genre}</span>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-ink">
                        {r.count} {r.count === 1 ? 'livro' : 'livros'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${share}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs text-ink-faint">
                        {share}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
