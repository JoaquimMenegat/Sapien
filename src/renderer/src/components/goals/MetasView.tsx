import { useEffect, useId, useMemo, useState } from 'react'
import { Target, Trash2, Plus, BookOpen, FileText, Clock, Flame, Check } from 'lucide-react'
import type { DailyStat, GoalType } from '../../../../shared/types'
import { useBooks } from '../../store/books'
import { useSessions } from '../../store/sessions'
import { useGoals } from '../../store/goals'

const YEAR = new Date().getFullYear()
const YM = `${YEAR}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
const WEEKDAY = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const todayStr = new Date().toISOString().slice(0, 10)

const GOAL_META: Record<GoalType, { label: string; period: string; unit: string; icon: typeof BookOpen }> = {
  livros_ano: { label: 'Livros no ano', period: `em ${YEAR}`, unit: 'livros', icon: BookOpen },
  livros_mes: { label: 'Livros no mês', period: 'este mês', unit: 'livros', icon: BookOpen },
  paginas_dia: { label: 'Páginas por dia', period: 'hoje', unit: 'páginas', icon: FileText },
  minutos_dia: { label: 'Minutos por dia', period: 'hoje', unit: 'min', icon: Clock }
}
const GOAL_ORDER: GoalType[] = ['livros_ano', 'livros_mes', 'paginas_dia', 'minutos_dia']
const MONTHLY: GoalType[] = ['livros_mes', 'paginas_dia', 'minutos_dia']

function computeStreak(daily: DailyStat[]): number {
  if (!daily.length) return 0
  const arr = [...daily].sort((a, b) => a.day.localeCompare(b.day))
  const active = (d: DailyStat): boolean => d.pages > 0 || d.sessions > 0
  let i = arr.length - 1
  if (!active(arr[i])) i--
  let s = 0
  for (; i >= 0; i--) {
    if (active(arr[i])) s++
    else break
  }
  return s
}

function BigRing({ value, target }: { value: number; target: number }): JSX.Element {
  const gid = useId().replace(/:/g, '')
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  const off = 314 - (314 * pct) / 100
  return (
    <svg width={180} height={180} viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="11" />
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
        style={{ animation: 'ringDraw 1.8s cubic-bezier(.22,1,.36,1) 300ms backwards' }}
      />
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#818cf8" />
          <stop offset="1" stopColor="#c4b5fd" />
        </linearGradient>
      </defs>
      <text x="60" y="56" textAnchor="middle" fontSize="26" fontWeight="800" fill="#f1f5f9">
        {value}
      </text>
      <text x="60" y="76" textAnchor="middle" fontSize="10" fill="#a5b4fc">
        {target > 0 ? `de ${target} livros` : 'sem meta'}
      </text>
    </svg>
  )
}

export function MetasView(): JSX.Element {
  const books = useBooks((s) => s.books)
  const loadBooks = useBooks((s) => s.load)
  const today = useSessions((s) => s.today)
  const refreshSessions = useSessions((s) => s.refresh)
  const { goals, load, setGoal, remove } = useGoals()

  const [daily, setDaily] = useState<DailyStat[]>([])
  const [newType, setNewType] = useState<GoalType>('livros_ano')
  const [newTarget, setNewTarget] = useState('12')

  useEffect(() => {
    void loadBooks()
    void refreshSessions()
    void load()
    void window.readdeck.sessions.daily(14).then(setDaily)
  }, [loadBooks, refreshSessions, load])

  const current = useMemo(() => {
    const lido = books.filter((b) => b.status === 'lido')
    return {
      livros_ano: lido.filter((b) => b.finished_at?.startsWith(String(YEAR))).length,
      livros_mes: lido.filter((b) => b.finished_at?.startsWith(YM)).length,
      paginas_dia: today?.pages ?? 0,
      minutos_dia: today?.minutes ?? 0
    } as Record<GoalType, number>
  }, [books, today])

  const streak = useMemo(() => computeStreak(daily), [daily])
  const lidosAno = current.livros_ano
  const annualGoal = goals.find((g) => g.type === 'livros_ano')?.target ?? 0

  const now = new Date()
  const monthsElapsed = now.getMonth() + 1
  const monthsLeft = 12 - now.getMonth()
  const remaining = Math.max(0, annualGoal - lidosAno)
  const projected = monthsElapsed > 0 ? Math.round((lidosAno / monthsElapsed) * 12) : 0
  const ahead = projected - annualGoal

  const monthlyGoals = goals.filter((g) => MONTHLY.includes(g.type as GoalType))

  async function addGoal(): Promise<void> {
    const t = parseInt(newTarget, 10)
    if (!Number.isFinite(t) || t <= 0) return
    await setGoal(newType, t)
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1fr_1.3fr]">
        {/* Meta anual — anel grande */}
        <div
          className="anim-fadeUp relative flex flex-col items-center gap-3.5 overflow-hidden rounded-[18px] p-8"
          style={{ background: 'linear-gradient(130deg,#1e1b4b,#312e81)', border: '1px solid rgba(99,102,241,.3)', animationDelay: '120ms' }}
        >
          <BigRing value={lidosAno} target={annualGoal} />
          <div className="text-[17px] font-extrabold text-[#f1f5f9]">Meta anual {YEAR}</div>
          <div className="text-center text-[12.5px] leading-relaxed text-[#c7d2fe]">
            {annualGoal === 0 ? (
              'Defina sua meta anual no formulário abaixo.'
            ) : lidosAno >= annualGoal ? (
              `Meta concluída! Você leu ${lidosAno} livros. 🎉`
            ) : (
              <>
                {ahead >= 0
                  ? `Você está ${ahead} livro(s) à frente do ritmo projetado.`
                  : `Você está ${-ahead} livro(s) atrás do ritmo projetado.`}
                <br />
                Faltam {remaining} livros em {monthsLeft} meses.
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-[18px]">
          {/* Sequência de leitura */}
          <div className="card anim-fadeUp p-6" style={{ animationDelay: '240ms' }}>
            <div className="flex items-baseline justify-between">
              <div className="text-sm font-extrabold text-ink">Sequência de leitura</div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Flame size={13} /> {streak} dias
              </div>
            </div>
            <div className="mt-4 flex gap-1.5">
              {daily.slice(-14).map((d) => {
                const active = d.pages > 0 || d.sessions > 0
                const isToday = d.day === todayStr
                const wd = WEEKDAY[new Date(`${d.day}T00:00:00`).getDay()]
                return (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="grid aspect-square w-full place-items-center rounded-lg text-white"
                      style={{
                        background: active ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'rgb(var(--c-elevated))',
                        border: isToday ? '2px solid #818cf8' : '1px solid rgb(var(--c-edge))'
                      }}
                      title={d.day}
                    >
                      {active ? <Check size={12} /> : isToday ? <span className="text-ink-faint">·</span> : ''}
                    </div>
                    <div className="text-[9px] font-semibold text-ink-faint">{wd}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Metas do mês */}
          <div className="card anim-fadeUp p-6" style={{ animationDelay: '340ms' }}>
            <div className="text-sm font-extrabold text-ink">Metas do mês</div>
            {monthlyGoals.length === 0 ? (
              <p className="mt-3 text-sm text-ink-faint">
                Nenhuma meta mensal ainda. Defina uma abaixo (livros/mês, páginas/dia ou minutos/dia).
              </p>
            ) : (
              <div className="mt-4 space-y-3.5">
                {monthlyGoals.map((g) => {
                  const meta = GOAL_META[g.type as GoalType]
                  const cur = current[g.type as GoalType] ?? 0
                  const pct = Math.min(100, Math.round((cur / g.target) * 100))
                  const done = cur >= g.target
                  const Icon = meta.icon
                  return (
                    <div key={g.id} className="flex items-center gap-3.5">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-accent/15 text-accent">
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-[12.5px] font-bold text-ink">{meta.label}</div>
                          <div className="flex shrink-0 items-center gap-2 text-[11.5px] font-bold text-[#a5b4fc]">
                            {done && <Check size={13} className="text-emerald-400" />}
                            {cur} de {g.target}
                            <button
                              onClick={() => void remove(g.id)}
                              aria-label="Remover meta"
                              className="text-ink-faint transition-colors hover:text-red-400"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-ink/10">
                          <div
                            className="h-[5px] rounded-full"
                            style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Registrar / atualizar uma meta */}
      <div className="card max-w-lg space-y-3 p-5">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Target size={16} className="text-ink-faint" /> Registrar meta
        </h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[180px] flex-1">
            <span className="mb-1 block text-xs font-medium text-ink-soft">Tipo</span>
            <select value={newType} onChange={(e) => setNewType(e.target.value as GoalType)} className="field">
              {GOAL_ORDER.map((t) => (
                <option key={t} value={t}>
                  {GOAL_META[t].label} ({GOAL_META[t].period})
                </option>
              ))}
            </select>
          </label>
          <label className="w-28">
            <span className="mb-1 block text-xs font-medium text-ink-soft">Alvo</span>
            <input
              type="number"
              min={1}
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="field"
            />
          </label>
          <button onClick={addGoal} className="btn-primary">
            <Plus size={16} /> Definir
          </button>
        </div>
        <p className="text-xs text-ink-faint">Já existe uma meta desse tipo? O alvo é atualizado.</p>
      </div>
    </div>
  )
}
