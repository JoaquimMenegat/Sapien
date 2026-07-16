import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import type { Book, BookStatus, DailyStat } from '../../../../shared/types'
import { useBooks } from '../../store/books'
import { useApp } from '../../store/app'
import { EncouragementBlock } from '../Encouragement'
import { STATUS_META, STATUS_ORDER, FORMAT_META, FORMAT_ORDER } from '../library/constants'

const STATUS_HEX: Record<BookStatus, string> = {
  wishlist: '#ec4899',
  fila: '#f59e0b',
  lendo: '#0ea5e9',
  pausado: '#8b5cf6',
  lido: '#10b981',
  abandonado: '#78716c'
}
const FORMAT_HEX: Record<string, string> = {
  fisico: '#10b981',
  ebook: '#3b82f6',
  audiolivro: '#f59e0b',
  kindle: '#8b5cf6'
}

// Lê as CSS variables do tema atual para os elementos de "moldura" dos gráficos
// (eixos, grade, tooltip), recalculando quando a aparência muda.
function useThemeColors(): Record<string, string> {
  const appearance = useApp((s) => s.appearance)
  return useMemo(() => {
    const cs = getComputedStyle(document.documentElement)
    const v = (n: string): string => `rgb(${cs.getPropertyValue(n).trim()})`
    return {
      ink: v('--c-ink'),
      inkFaint: v('--c-ink-faint'),
      edge: v('--c-edge'),
      surface: v('--c-surface'),
      accent: v('--c-accent')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appearance])
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
      <p className="mt-1 font-serif text-2xl font-semibold text-ink">{value}</p>
    </div>
  )
}

function monthlyRead(books: Book[]): { label: string; value: number }[] {
  const now = new Date()
  const buckets: { key: string; label: string; value: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    buckets.push({ key, label, value: 0 })
  }
  const map = new Map(buckets.map((b) => [b.key, b]))
  for (const b of books) {
    if (b.status === 'lido' && b.finished_at) {
      const bucket = map.get(b.finished_at.slice(0, 7))
      if (bucket) bucket.value++
    }
  }
  return buckets.map(({ label, value }) => ({ label, value }))
}

function Donut({
  data,
  colors
}: {
  data: { name: string; value: number }[]
  colors: string[]
}): JSX.Element {
  const c = useThemeColors()
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={52}
          outerRadius={80}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: c.surface,
            border: `1px solid ${c.edge}`,
            borderRadius: 12,
            color: c.ink,
            fontSize: 13
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

function Legend({ items }: { items: { name: string; value: number; color: string }[] }): JSX.Element {
  return (
    <div className="space-y-1.5">
      {items.map((it) => (
        <div key={it.name} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-ink-soft">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: it.color }} />
            {it.name}
          </span>
          <span className="font-medium text-ink">{it.value}</span>
        </div>
      ))}
    </div>
  )
}

const RANGES: { days: number; label: string }[] = [
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
  { days: 365, label: '1 ano' }
]

function dayLabel(day: string): string {
  const [, m, d] = day.split('-')
  return `${d}/${m}`
}

export function StatsView(): JSX.Element {
  const books = useBooks((s) => s.books)
  const load = useBooks((s) => s.load)
  const c = useThemeColors()
  const [daily, setDaily] = useState<DailyStat[]>([])
  const [pace, setPace] = useState<number | null>(null)
  const [rangeDays, setRangeDays] = useState(30)

  useEffect(() => {
    void load()
    void window.readdeck.sessions.pace().then(setPace)
  }, [load])

  useEffect(() => {
    void window.readdeck.sessions.daily(rangeDays).then(setDaily)
  }, [rangeDays])

  const series = useMemo(
    () =>
      daily.map((d) => ({
        label: dayLabel(d.day),
        pages: d.pages,
        minutes: d.minutes,
        sessions: d.sessions
      })),
    [daily]
  )
  // Mostra ~8–10 rótulos no eixo X, independente do tamanho da janela.
  const xInterval = Math.max(0, Math.floor(series.length / 9))
  const rangeLabel = RANGES.find((r) => r.days === rangeDays)?.label ?? `${rangeDays} dias`
  const period = useMemo(
    () =>
      daily.reduce(
        (a, d) => ({
          sessions: a.sessions + d.sessions,
          pages: a.pages + d.pages,
          minutes: a.minutes + d.minutes
        }),
        { sessions: 0, pages: 0, minutes: 0 }
      ),
    [daily]
  )

  const stats = useMemo(() => {
    const lido = books.filter((b) => b.status === 'lido')
    const pagesRead = lido.reduce((s, b) => s + (b.total_pages ?? 0), 0)
    const rated = books.filter((b) => b.rating != null)
    const avg = rated.length ? rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length : 0
    const year = new Date().getFullYear()
    const thisYear = lido.filter((b) => b.finished_at?.startsWith(String(year))).length

    const statusData = STATUS_ORDER.map((s) => ({
      name: STATUS_META[s].label,
      value: books.filter((b) => b.status === s).length,
      color: STATUS_HEX[s]
    })).filter((d) => d.value > 0)

    const formatData = FORMAT_ORDER.map((f) => ({
      name: FORMAT_META[f],
      value: books.filter((b) => b.format === f).length,
      color: FORMAT_HEX[f]
    })).filter((d) => d.value > 0)

    return {
      total: books.length,
      lidoCount: lido.length,
      pagesRead,
      avg,
      thisYear,
      monthly: monthlyRead(books),
      statusData,
      formatData
    }
  }, [books])

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-edge py-16 text-center">
        <BarChart3 size={28} className="text-ink-faint" />
        <p className="text-sm text-ink-soft">
          Adicione e marque livros como lidos para ver suas estatísticas ganharem vida aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Livros no acervo" value={stats.total} color="#3b82f6" />
        <MetricCard label="Lidos" value={stats.lidoCount} color="#10b981" />
        <MetricCard label="Páginas lidas" value={stats.pagesRead.toLocaleString('pt-BR')} color="#8b5cf6" />
        <MetricCard
          label="Avaliação média"
          value={stats.avg ? `★ ${stats.avg.toFixed(1)}` : '—'}
          color="#f59e0b"
        />
      </div>

      <EncouragementBlock />

      <div className="card p-5">
        <h2 className="mb-1 font-serif text-lg font-semibold text-ink">Livros lidos por mês</h2>
        <p className="mb-4 text-xs text-ink-faint">
          Últimos 12 meses · {stats.thisYear} concluídos em {new Date().getFullYear()}
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={stats.monthly} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={c.edge} />
            <XAxis
              dataKey="label"
              tick={{ fill: c.inkFaint, fontSize: 12 }}
              axisLine={{ stroke: c.edge }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: c.inkFaint, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: c.edge, opacity: 0.4 }}
              contentStyle={{
                background: c.surface,
                border: `1px solid ${c.edge}`,
                borderRadius: 12,
                color: c.ink,
                fontSize: 13
              }}
              labelStyle={{ color: c.ink }}
            />
            <Bar name="Livros" dataKey="value" fill={c.accent} radius={[6, 6, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-serif text-lg font-semibold text-ink">Por status</h2>
          <div className="grid grid-cols-[1fr_auto] items-center gap-4">
            <Donut data={stats.statusData} colors={stats.statusData.map((d) => d.color)} />
            <Legend items={stats.statusData} />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-serif text-lg font-semibold text-ink">Por formato</h2>
          {stats.formatData.length > 0 ? (
            <div className="grid grid-cols-[1fr_auto] items-center gap-4">
              <Donut data={stats.formatData} colors={stats.formatData.map((d) => d.color)} />
              <Legend items={stats.formatData} />
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-ink-faint">
              Defina o formato dos livros (físico, ebook…) para ver aqui.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold text-ink">
            Sua evolução{' '}
            <span className="text-sm font-normal text-ink-faint">· últimos {rangeLabel}</span>
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setRangeDays(r.days)}
                className={`chip ${rangeDays === r.days ? 'active' : ''}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Ritmo médio" value={pace ? `${pace} pág/h` : '—'} color="#f59e0b" />
          <MetricCard label="Sessões" value={period.sessions} color="#3b82f6" />
          <MetricCard label="Páginas" value={period.pages} color="#10b981" />
          <MetricCard label="Minutos" value={period.minutes} color="#8b5cf6" />
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-serif text-base font-semibold text-ink">Páginas por dia</h3>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={series} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={c.edge} />
              <XAxis dataKey="label" tick={{ fill: c.inkFaint, fontSize: 11 }} axisLine={{ stroke: c.edge }} tickLine={false} interval={xInterval} minTickGap={8} />
              <YAxis allowDecimals={false} tick={{ fill: c.inkFaint, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ background: c.surface, border: `1px solid ${c.edge}`, borderRadius: 12, color: c.ink, fontSize: 13 }} labelStyle={{ color: c.ink }} />
              <Area name="Páginas" dataKey="pages" stroke={c.accent} strokeWidth={2} fill={c.accent} fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h3 className="mb-4 font-serif text-base font-semibold text-ink">Minutos por dia</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={series} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={c.edge} />
                <XAxis dataKey="label" tick={{ fill: c.inkFaint, fontSize: 11 }} axisLine={{ stroke: c.edge }} tickLine={false} interval={xInterval} minTickGap={8} />
                <YAxis allowDecimals={false} tick={{ fill: c.inkFaint, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip cursor={{ fill: c.edge, opacity: 0.4 }} contentStyle={{ background: c.surface, border: `1px solid ${c.edge}`, borderRadius: 12, color: c.ink, fontSize: 13 }} labelStyle={{ color: c.ink }} />
                <Bar name="Minutos" dataKey="minutes" fill="#8b5cf6" radius={[5, 5, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-5">
            <h3 className="mb-4 font-serif text-base font-semibold text-ink">Sessões por dia</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={series} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={c.edge} />
                <XAxis dataKey="label" tick={{ fill: c.inkFaint, fontSize: 11 }} axisLine={{ stroke: c.edge }} tickLine={false} interval={xInterval} minTickGap={8} />
                <YAxis allowDecimals={false} tick={{ fill: c.inkFaint, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip cursor={{ fill: c.edge, opacity: 0.4 }} contentStyle={{ background: c.surface, border: `1px solid ${c.edge}`, borderRadius: 12, color: c.ink, fontSize: 13 }} labelStyle={{ color: c.ink }} />
                <Bar name="Sessões" dataKey="sessions" fill="#3b82f6" radius={[5, 5, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
