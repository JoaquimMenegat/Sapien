import { useEffect, useId, useMemo, useState } from 'react'
import { LayoutGrid, List as ListIcon, Table2, Plus, BookMarked, Play, Flame } from 'lucide-react'
import type { Book, DailyStat } from '../../../../shared/types'
import { useBooks, type StatusFilter, type ViewMode } from '../../store/books'
import { useApp } from '../../store/app'
import { useSessions } from '../../store/sessions'
import { useGoals } from '../../store/goals'
import { STATUS_ORDER, STATUS_META, FORMAT_META } from './constants'
import { BookCover, StatusBadge, StarRating, ReadingProgress } from './BookBits'
import { AddBookModal } from './AddBookModal'
import { BookDetailModal } from './BookDetailModal'
import { EncouragementLine } from '../Encouragement'

const IN_PROGRESS: Book['status'][] = ['lendo', 'pausado', 'abandonado']

function progress(b: Book): number {
  if (!b.total_pages || b.total_pages <= 0) return 0
  return Math.min(100, Math.round((b.current_page / b.total_pages) * 100))
}

const VIEWS: { id: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
  { id: 'grade', icon: LayoutGrid, label: 'Grade' },
  { id: 'lista', icon: ListIcon, label: 'Lista' },
  { id: 'tabela', icon: Table2, label: 'Tabela' }
]

const MONTH_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function computeStreak(daily: DailyStat[]): number {
  if (!daily.length) return 0
  const arr = [...daily].sort((a, b) => a.day.localeCompare(b.day))
  const active = (d: DailyStat): boolean => d.pages > 0 || d.sessions > 0
  let i = arr.length - 1
  if (!active(arr[i])) i-- // ignora hoje se ainda não houve sessão
  let s = 0
  for (; i >= 0; i--) {
    if (active(arr[i])) s++
    else break
  }
  return s
}

function restanteText(pagesLeft: number, pace: number | null): string {
  if (pagesLeft <= 0) return 'na última página'
  if (pace && pace > 0) {
    const mins = Math.round((pagesLeft / pace) * 60)
    if (mins >= 60) {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return `~${h}h${m ? ` ${m}min` : ''} restantes`
    }
    return `~${mins}min restantes`
  }
  return `faltam ${pagesLeft} pág`
}

// KPI: label, valor em gradiente, tendência opcional e mini-barra.
function KpiCard({
  label,
  value,
  unit,
  trend,
  pct,
  delay
}: {
  label: string
  value: string | number
  unit?: string
  trend?: string
  pct: number
  delay: number
}): JSX.Element {
  return (
    <div className="card lift anim-fadeUp p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-soft">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="grad-text text-[30px] font-extrabold tracking-[-0.03em]">{value}</div>
        {unit && <div className="text-xs font-semibold text-ink-faint">{unit}</div>}
        {trend && <div className="text-[11.5px] font-bold text-emerald-400">{trend}</div>}
      </div>
      <div className="mt-3.5 h-1 overflow-hidden rounded-full bg-ink/10">
        <div
          className="h-1 rounded-full"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }}
        />
      </div>
    </div>
  )
}

function Ring({ pct, top, bottom }: { pct: number; top: string; bottom: string }): JSX.Element {
  const gid = useId().replace(/:/g, '')
  const off = 314 - (314 * Math.max(0, Math.min(100, pct))) / 100
  return (
    <svg width={112} height={112} viewBox="0 0 120 120" className="shrink-0">
      <circle cx="60" cy="60" r="50" fill="none" stroke="rgb(var(--c-elevated))" strokeWidth="11" />
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray="314"
        strokeDashoffset={off}
        transform="rotate(-90 60 60)"
        style={{ animation: 'ringDraw 1.6s cubic-bezier(.22,1,.36,1)' }}
      />
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <text x="60" y="57" textAnchor="middle" fontSize="24" fontWeight="800" fill="rgb(var(--c-ink))">
        {top}
      </text>
      <text x="60" y="76" textAnchor="middle" fontSize="10" fill="rgb(var(--c-ink-soft))">
        {bottom}
      </text>
    </svg>
  )
}

export function LibraryView(): JSX.Element {
  const { books, loading, filter, view, load, setFilter, setView } = useBooks()
  const addBookOpen = useApp((s) => s.addBookOpen)
  const setAddBookOpen = useApp((s) => s.setAddBookOpen)
  const setSection = useApp((s) => s.setSection)
  const pace = useSessions((s) => s.pace)
  const refreshSessions = useSessions((s) => s.refresh)
  const goals = useGoals((s) => s.goals)
  const loadGoals = useGoals((s) => s.load)

  const [selected, setSelected] = useState<Book | null>(null)
  const [daily, setDaily] = useState<DailyStat[]>([])
  const [year, setYear] = useState<number | 'all'>('all')
  const [month, setMonth] = useState<number | 'all'>('all')

  useEffect(() => {
    void load()
    void refreshSessions()
    void loadGoals()
    void window.readdeck.sessions.daily(35).then(setDaily)
  }, [load, refreshSessions, loadGoals])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: books.length }
    for (const s of STATUS_ORDER) c[s] = books.filter((b) => b.status === s).length
    return c
  }, [books])

  // --- Métricas do dashboard (dados reais) ---
  const now = new Date()
  const curYear = now.getFullYear()
  const ym = `${curYear}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const daysInMonth = new Date(curYear, now.getMonth() + 1, 0).getDate()

  const lidosAno = books.filter((b) => b.status === 'lido' && b.finished_at?.startsWith(String(curYear))).length
  const lidosMes = books.filter((b) => b.status === 'lido' && b.finished_at?.startsWith(ym)).length
  const paginasMes = daily.filter((d) => d.day.startsWith(ym)).reduce((s, d) => s + d.pages, 0)
  const streak = useMemo(() => computeStreak(daily), [daily])

  const annualGoal = goals.find((g) => g.type === 'livros_ano')?.target ?? 0
  const paginasDiaGoal = goals.find((g) => g.type === 'paginas_dia')?.target ?? 0
  const metaPct = annualGoal ? Math.min(100, Math.round((lidosAno / annualGoal) * 100)) : 0
  const paginasPct = paginasDiaGoal
    ? Math.min(100, Math.round((paginasMes / (paginasDiaGoal * daysInMonth)) * 100))
    : Math.min(100, paginasMes > 0 ? 55 : 0)

  const hero = useMemo(
    () => books.filter((b) => b.status === 'lendo').sort((a, b) => progress(b) - progress(a))[0] ?? null,
    [books]
  )

  // Anos com livros concluídos (filtro da aba "Lido").
  const years = useMemo(() => {
    const s = new Set<number>()
    for (const b of books) if (b.status === 'lido' && b.finished_at) s.add(Number(b.finished_at.slice(0, 4)))
    return [...s].sort((a, b) => b - a)
  }, [books])

  const monthsForYear = useMemo(() => {
    if (year === 'all') return []
    const s = new Set<number>()
    for (const b of books) {
      if (b.status === 'lido' && b.finished_at?.startsWith(String(year))) s.add(Number(b.finished_at.slice(5, 7)))
    }
    return [...s].sort((a, b) => a - b)
  }, [books, year])

  const filtered = useMemo(() => {
    let list = filter === 'all' ? books : books.filter((b) => b.status === filter)
    if (filter === 'lido') {
      if (year !== 'all') list = list.filter((b) => b.finished_at?.startsWith(String(year)))
      if (year !== 'all' && month !== 'all') {
        const ymSel = `${year}-${String(month).padStart(2, '0')}`
        list = list.filter((b) => b.finished_at?.startsWith(ymSel))
      }
    }
    return list
  }, [books, filter, year, month])

  const tabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    ...STATUS_ORDER.map((s) => ({ id: s as StatusFilter, label: STATUS_META[s].label }))
  ]

  return (
    <div className="space-y-6">
      <EncouragementLine />

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Livros lidos"
          value={lidosAno}
          trend={lidosMes > 0 ? `+${lidosMes} no mês` : undefined}
          pct={metaPct}
          delay={100}
        />
        <KpiCard label="Páginas no mês" value={paginasMes.toLocaleString('pt-BR')} pct={paginasPct} delay={220} />
        <KpiCard
          label="Ritmo médio"
          value={pace ?? '—'}
          unit={pace ? 'pág/h' : ''}
          pct={pace ? Math.min(100, Math.round((pace / 60) * 100)) : 0}
          delay={340}
        />
        <KpiCard label="Sequência" value={streak} unit="dias" pct={Math.min(100, Math.round((streak / 30) * 100))} delay={460} />
      </div>

      {/* ── Hero "Lendo agora" + Meta anual ── */}
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.5fr_1fr]">
        {hero ? (
          <div
            className="anim-fadeUp relative overflow-hidden rounded-[18px] p-7"
            style={{ background: 'linear-gradient(120deg,#1e1b4b,#312e81 60%,#4c1d95)', animationDelay: '520ms' }}
          >
            <div
              className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full"
              style={{ background: 'radial-gradient(circle,rgba(124,58,237,.45),transparent 70%)' }}
            />
            <div className="relative flex items-center gap-7">
              <button onClick={() => setSelected(hero)} className="anim-float shrink-0" aria-label={hero.title}>
                <BookCover
                  url={hero.cover_url}
                  title={hero.title}
                  className="h-[154px] w-[108px] rounded-[10px] shadow-[0_18px_34px_rgba(0,0,0,0.4)]"
                />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-[10.5px] font-bold tracking-[0.16em] text-[#a5b4fc]">LENDO AGORA</div>
                <button
                  onClick={() => setSelected(hero)}
                  className="mt-1.5 block max-w-full truncate text-left text-2xl font-extrabold tracking-[-0.02em] text-[#eef2ff]"
                >
                  {hero.title}
                </button>
                <div className="mt-1 truncate text-[12.5px] text-[#c7d2fe]">
                  {hero.authors ?? 'Autor desconhecido'}
                  {hero.total_pages
                    ? ` · pág. ${hero.current_page} de ${hero.total_pages} · ${restanteText(
                        hero.total_pages - hero.current_page,
                        pace
                      )}`
                    : ''}
                </div>
                <div className="mt-3 flex items-center gap-3.5">
                  <div className="h-2 max-w-[240px] flex-1 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${progress(hero)}%`, background: 'linear-gradient(90deg,#818cf8,#c4b5fd)' }}
                    />
                  </div>
                  <div className="text-[13px] font-bold text-white">{progress(hero)}%</div>
                </div>
                <button
                  onClick={() => setSection('pomodoro')}
                  className="mt-4 flex items-center gap-2 rounded-[10px] bg-white px-5 py-2.5 text-[12.5px] font-bold text-[#312e81] transition-transform hover:-translate-y-0.5"
                >
                  <Play size={14} /> Iniciar sessão
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="card anim-fadeUp flex flex-col items-start justify-center gap-3 p-7"
            style={{ animationDelay: '520ms' }}
          >
            <div className="text-[10.5px] font-bold tracking-[0.16em] text-accent">LENDO AGORA</div>
            <div className="text-lg font-bold text-ink">Nenhuma leitura em andamento.</div>
            <div className="text-sm text-ink-soft">Mova um livro para “Lendo” para acompanhar seu progresso aqui.</div>
          </div>
        )}

        {annualGoal > 0 ? (
          <button
            onClick={() => setSection('metas')}
            className="card lift anim-fadeUp flex items-center gap-5 p-6 text-left"
            style={{ animationDelay: '620ms' }}
          >
            <Ring pct={metaPct} top={`${metaPct}%`} bottom={`${lidosAno} de ${annualGoal}`} />
            <div className="flex flex-col gap-2">
              <div className="text-[14.5px] font-extrabold text-ink">Meta anual {curYear}</div>
              <div className="text-xs leading-relaxed text-ink-soft">
                {lidosAno >= annualGoal ? 'Meta concluída! 🎉' : `Faltam ${annualGoal - lidosAno} livros para a meta.`}
              </div>
              {streak > 0 && (
                <div className="flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                  <Flame size={11} /> Sequência de {streak} dias
                </div>
              )}
            </div>
          </button>
        ) : (
          <button
            onClick={() => setSection('metas')}
            className="card lift anim-fadeUp flex flex-col items-start justify-center gap-2 p-6 text-left"
            style={{ animationDelay: '620ms' }}
          >
            <div className="text-[14.5px] font-extrabold text-ink">Defina sua meta anual</div>
            <div className="text-xs leading-relaxed text-ink-soft">Acompanhe quantos livros quer ler em {curYear}.</div>
            <span className="mt-1 text-xs font-bold text-accent">Ir para Metas →</span>
          </button>
        )}
      </div>

      {/* ── Estante ── */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <div className="text-[17px] font-extrabold tracking-tight text-ink">Sua estante</div>
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setFilter(t.id)} className={`chip ${filter === t.id ? 'active' : ''}`}>
              {t.label}
              <span className={filter === t.id ? 'text-white/70' : 'text-ink-faint'}>{counts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-edge bg-surface p-0.5">
            {VIEWS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                title={label}
                aria-label={label}
                className={`rounded-md p-1.5 transition-colors ${
                  view === id ? 'text-white' : 'text-ink-faint hover:text-ink'
                }`}
                style={view === id ? { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' } : undefined}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {filter === 'lido' && years.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-ink-faint">Ano</span>
          {(['all', ...years] as (number | 'all')[]).map((y) => (
            <button
              key={y}
              onClick={() => {
                setYear(y)
                setMonth('all')
              }}
              className={`chip ${year === y ? 'active' : ''}`}
            >
              {y === 'all' ? 'Todos' : y}
            </button>
          ))}
          {year !== 'all' && monthsForYear.length > 0 && (
            <>
              <span className="mx-1 text-ink-faint">·</span>
              <span className="mr-1 text-xs font-medium text-ink-faint">Mês</span>
              {(['all', ...monthsForYear] as (number | 'all')[]).map((m) => (
                <button key={m} onClick={() => setMonth(m)} className={`chip capitalize ${month === m ? 'active' : ''}`}>
                  {m === 'all' ? 'Todos' : MONTH_NAMES[(m as number) - 1]}
                </button>
              ))}
            </>
          )}
        </div>
      )}

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
          <button onClick={() => setAddBookOpen(true)} className="btn-primary">
            <Plus size={16} /> Adicionar livro
          </button>
        </div>
      ) : view === 'grade' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
          {filtered.map((b) => (
            <button key={b.id} onClick={() => setSelected(b)} className="group text-left">
              <BookCover
                url={b.cover_url}
                title={b.title}
                className="aspect-[2/3] w-full rounded-xl border border-edge transition-transform group-hover:-translate-y-1"
              />
              <div className="mt-2 space-y-1">
                <p className="truncate text-sm font-semibold text-ink">{b.title}</p>
                {b.authors && <p className="truncate text-xs text-ink-faint">{b.authors}</p>}
                <StatusBadge status={b.status} />
                {IN_PROGRESS.includes(b.status) && b.total_pages ? (
                  <ReadingProgress current={b.current_page} total={b.total_pages} className="pt-0.5" />
                ) : null}
              </div>
            </button>
          ))}
        </div>
      ) : view === 'lista' ? (
        <div className="space-y-1.5">
          {filtered.map((b) => (
            <button key={b.id} onClick={() => setSelected(b)} className="card lift flex w-full items-center gap-3 p-2.5 text-left">
              <BookCover url={b.cover_url} title={b.title} className="h-16 w-11 shrink-0 rounded border border-edge" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{b.title}</p>
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
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge text-left text-xs text-ink-faint">
                <th className="px-3 py-2.5 font-semibold">Título</th>
                <th className="px-3 py-2.5 font-semibold">Autor</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Progresso</th>
                <th className="px-3 py-2.5 font-semibold">Nota</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setSelected(b)}
                  className="cursor-pointer border-b border-edge last:border-0 hover:bg-ink/[0.03]"
                >
                  <td className="px-3 py-2.5 font-semibold text-ink">{b.title}</td>
                  <td className="px-3 py-2.5 text-ink-soft">{b.authors ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-3 py-2.5 text-ink-soft">{b.total_pages ? `${progress(b)}%` : '—'}</td>
                  <td className="px-3 py-2.5">
                    <StarRating value={b.rating} size={12} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddBookModal open={addBookOpen} onClose={() => setAddBookOpen(false)} />
      <BookDetailModal book={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
