import { useEffect, useMemo, useState } from 'react'
import { HeartHandshake } from 'lucide-react'
import type { DailyStat } from '../../../shared/types'
import { useApp } from '../store/app'
import { useBooks } from '../store/books'
import { usePomodoro } from '../store/pomodoro'

// Retorno sem culpa: quando alguém some por um tempo e volta, o app acolhe em vez de
// exibir uma sequência zerada. Nada de "você falhou" — o que já foi lido não se perde,
// e a porta de entrada é a menor possível (10 minutos).
// Plano completo em COACH.md.

const ABSENT_DAYS = 7
const WINDOW = 120

/** Dias desde a última leitura registrada (null se nunca leu na janela). */
function daysSinceLastRead(daily: DailyStat[]): number | null {
  const active = daily.filter((d) => d.sessions > 0 || d.pages > 0)
  if (!active.length) return null
  const last = active[active.length - 1].day
  const diff = Date.now() - new Date(`${last}T12:00:00`).getTime()
  return Math.floor(diff / 86_400_000)
}

/** Maior sequência de dias seguidos com leitura — um recorde que nunca se perde. */
function bestStreak(daily: DailyStat[]): number {
  let best = 0
  let cur = 0
  for (const d of daily) {
    if (d.sessions > 0 || d.pages > 0) {
      cur++
      best = Math.max(best, cur)
    } else cur = 0
  }
  return best
}

/** Quantas vezes a pessoa já voltou depois de uma pausa longa. Voltar é conquista. */
function comebackCount(daily: DailyStat[]): number {
  let count = 0
  let gap = 0
  let seenFirst = false
  for (const d of daily) {
    const active = d.sessions > 0 || d.pages > 0
    if (active) {
      if (seenFirst && gap >= ABSENT_DAYS) count++
      seenFirst = true
      gap = 0
    } else if (seenFirst) gap++
  }
  return count
}

export function ComebackCard(): JSX.Element | null {
  const books = useBooks((s) => s.books)
  const loadBooks = useBooks((s) => s.load)
  const setSection = useApp((s) => s.setSection)
  const setFocus = usePomodoro((s) => s.setFocus)
  const [daily, setDaily] = useState<DailyStat[] | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    void loadBooks()
    void window.readdeck.sessions.daily(WINDOW).then(setDaily)
  }, [loadBooks])

  const info = useMemo(() => {
    if (!daily) return null
    const away = daysSinceLastRead(daily)
    return {
      away,
      best: bestStreak(daily),
      comebacks: comebackCount(daily),
      pages: books.reduce((sum, b) => sum + (b.current_page || 0), 0),
      reading: books.find((b) => b.status === 'lendo') ?? null
    }
  }, [daily, books])

  // Só aparece para quem já leu alguma vez e está ausente há um tempo.
  if (!info || dismissed || info.away === null || info.away < ABSENT_DAYS) return null

  function start(): void {
    setFocus(10)
    setSection('pomodoro')
  }

  return (
    <div className="anim-fadeUp card border-accent/30 bg-accent/[0.05] p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <HeartHandshake size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg font-bold text-ink">Que bom te ver de volta.</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Nada se perdeu: você já leu <b className="text-ink">{info.pages.toLocaleString('pt-BR')} páginas</b> no
            Sapien
            {info.best > 1 && (
              <>
                {' '}
                e sua melhor sequência foi de <b className="text-ink">{info.best} dias</b>
              </>
            )}
            .
            {info.comebacks > 0 && ' Esta é a sua ' + (info.comebacks + 1) + 'ª retomada — quem volta, lê.'}
          </p>
          {info.reading && (
            <p className="mt-1.5 text-sm text-ink-faint">
              Você parou na página {info.reading.current_page} de <i>{info.reading.title}</i>.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={start} className="btn-primary py-2 text-sm">
              Recomeçar com 10 minutos
            </button>
            <button onClick={() => setDismissed(true)} className="btn-ghost py-2 text-sm">
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
