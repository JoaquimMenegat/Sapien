import { useEffect, useMemo, useState } from 'react'
import { Target, Check, Trash2, Plus } from 'lucide-react'
import type { GoalType } from '../../../../shared/types'
import { useBooks } from '../../store/books'
import { useSessions } from '../../store/sessions'
import { useGoals } from '../../store/goals'

const YEAR = new Date().getFullYear()
const YM = `${YEAR}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

const GOAL_META: Record<GoalType, { label: string; period: string; unit: string; color: string }> = {
  livros_ano: { label: 'Livros no ano', period: `em ${YEAR}`, unit: 'livros', color: '#10b981' },
  livros_mes: { label: 'Livros no mês', period: 'este mês', unit: 'livros', color: '#3b82f6' },
  paginas_dia: { label: 'Páginas por dia', period: 'hoje', unit: 'páginas', color: '#8b5cf6' },
  minutos_dia: { label: 'Minutos por dia', period: 'hoje', unit: 'min', color: '#f59e0b' }
}
const GOAL_ORDER: GoalType[] = ['livros_ano', 'livros_mes', 'paginas_dia', 'minutos_dia']

export function MetasView(): JSX.Element {
  const books = useBooks((s) => s.books)
  const loadBooks = useBooks((s) => s.load)
  const today = useSessions((s) => s.today)
  const refreshSessions = useSessions((s) => s.refresh)
  const { goals, load, setGoal, remove } = useGoals()

  const [newType, setNewType] = useState<GoalType>('livros_ano')
  const [newTarget, setNewTarget] = useState('12')

  useEffect(() => {
    void loadBooks()
    void refreshSessions()
    void load()
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

  async function addGoal(): Promise<void> {
    const t = parseInt(newTarget, 10)
    if (!Number.isFinite(t) || t <= 0) return
    await setGoal(newType, t)
  }

  return (
    <div className="space-y-5">
      <p className="max-w-xl text-[15px] leading-relaxed text-ink-soft">
        Defina metas de leitura e acompanhe o progresso — calculado dos seus livros lidos e das
        sessões do Pomodoro.
      </p>

      {goals.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {goals.map((g) => {
            const meta = GOAL_META[g.type as GoalType]
            if (!meta) return null
            const cur = current[g.type as GoalType] ?? 0
            const pct = Math.min(100, Math.round((cur / g.target) * 100))
            const done = cur >= g.target
            return (
              <div key={g.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">{meta.label}</p>
                    <p className="text-xs text-ink-faint">{meta.period}</p>
                  </div>
                  <button
                    onClick={() => void remove(g.id)}
                    aria-label="Remover meta"
                    className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-serif text-2xl font-semibold text-ink">{cur}</span>
                  <span className="text-sm text-ink-soft">
                    / {g.target} {meta.unit}
                  </span>
                  {done && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <Check size={12} /> Concluída
                    </span>
                  )}
                </div>

                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: done ? '#10b981' : meta.color
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="card max-w-lg space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-serif text-base font-semibold text-ink">
          <Target size={16} className="text-ink-faint" /> Nova meta
        </h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-ink-soft">Tipo</span>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as GoalType)}
              className="field"
            >
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
        <p className="text-xs text-ink-faint">
          Já existe uma meta desse tipo? O alvo é atualizado.
        </p>
      </div>

      {goals.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-edge py-10 text-center">
          <Target size={26} className="text-ink-faint" />
          <p className="text-sm text-ink-soft">Nenhuma meta ainda. Defina a primeira acima!</p>
        </div>
      )}
    </div>
  )
}
