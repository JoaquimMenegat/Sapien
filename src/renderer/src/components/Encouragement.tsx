import { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { DailyStat } from '../../../shared/types'
import { useBooks } from '../store/books'
import { useGoals } from '../store/goals'
import { useSessions } from '../store/sessions'
import {
  buildEncInput,
  computeEncouragements,
  bestPool,
  allPositive,
  type Encouragements
} from '../lib/encouragement'

function useEncouragements(): { enc: Encouragements; ready: boolean } {
  const books = useBooks((s) => s.books)
  const loadBooks = useBooks((s) => s.load)
  const goals = useGoals((s) => s.goals)
  const loadGoals = useGoals((s) => s.load)
  const pace = useSessions((s) => s.pace)
  const refreshSessions = useSessions((s) => s.refresh)
  const [daily, setDaily] = useState<DailyStat[] | null>(null)

  useEffect(() => {
    void loadBooks()
    void loadGoals()
    void refreshSessions()
    void window.readdeck.sessions.daily(62).then(setDaily)
  }, [loadBooks, loadGoals, refreshSessions])

  const enc = useMemo(
    () => computeEncouragements(buildEncInput(books, daily ?? [], goals, pace)),
    [books, daily, goals, pace]
  )
  return { enc, ready: daily !== null }
}

// Linha compacta para os indicadores (Biblioteca): uma frase, escolhida ao acaso.
export function EncouragementLine(): JSX.Element | null {
  const { enc, ready } = useEncouragements()
  const [seed] = useState(() => Math.random())
  if (!ready) return null
  // Prioriza mensagens de evolução (evergreen só se não houver nada guiado por dados).
  const pool = bestPool(enc)
  if (!pool.length) return null
  const msg = pool[Math.floor(seed * pool.length) % pool.length]
  return (
    <div className="anim-fadeUp flex items-center gap-2.5 rounded-xl border border-edge bg-surface/60 px-4 py-2.5">
      <Sparkles size={15} className="shrink-0 text-accent" />
      <span className="text-sm italic text-ink-soft">{msg.text}</span>
    </div>
  )
}

function Chip({ text, gentle }: { text: string; gentle?: boolean }): JSX.Element {
  return (
    <span
      className={`rounded-2xl border px-4 py-2.5 text-sm italic ${
        gentle ? 'border-amber-500/40 text-amber-200/90' : 'border-edge bg-surface text-ink-soft'
      }`}
    >
      “{text}”
    </span>
  )
}

// Bloco completo para os relatórios (Estatísticas): várias frases + tom gentil.
export function EncouragementBlock(): JSX.Element | null {
  const { enc, ready } = useEncouragements()
  if (!ready) return null
  const positive = allPositive(enc).slice(0, 5)
  const gentle = enc.gentle.slice(0, 3)
  return (
    <div className="card p-5">
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Os números não falam sozinhos. O Sapien traduz seus dados em mensagens que incentivam —
        nunca que cobram:
      </p>
      <div className="flex flex-wrap gap-2.5">
        {positive.map((m) => (
          <Chip key={m.key} text={m.text} />
        ))}
      </div>
      <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        E quando a semana aperta:
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2.5">
        {gentle.map((m) => (
          <Chip key={m.key} text={m.text} gentle />
        ))}
      </div>
      <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-400/80">
        Progresso sem culpa.
      </div>
    </div>
  )
}
