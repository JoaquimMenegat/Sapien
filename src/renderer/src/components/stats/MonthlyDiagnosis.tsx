import { useEffect, useMemo, useState } from 'react'
import { Stethoscope, Clock, CalendarCheck } from 'lucide-react'
import type { SessionWithBook } from '../../../../shared/types'
import { diagnoseMonth, monthsWithSessions, monthNarrative, type MonthDiagnosis } from '../../lib/diagnostics'

// Diagnóstico mensal: responde o que o usuário não consegue responder sozinho —
// em que horário ele rende mais, em que dia lê melhor e como foi o mês.

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]
const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function label(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}
function fmtMin(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const r = min % 60
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`
}

function Delta({ now, before, unit }: { now: number; before: number; unit?: string }): JSX.Element | null {
  if (before === 0) return null
  const diff = now - before
  if (diff === 0) return <span className="text-[11px] text-ink-faint">igual ao mês passado</span>
  const up = diff > 0
  return (
    <span className={`text-[11px] font-medium ${up ? 'text-emerald-500' : 'text-ink-faint'}`}>
      {up ? '+' : ''}
      {diff}
      {unit ? ` ${unit}` : ''} vs. mês passado
    </span>
  )
}

function Metric({
  label: l,
  value,
  now,
  before,
  unit
}: {
  label: string
  value: string
  now: number
  before: number
  unit?: string
}): JSX.Element {
  return (
    <div className="rounded-xl border border-edge p-3.5">
      <div className="text-xs text-ink-faint">{l}</div>
      <div className="mt-0.5 text-xl font-extrabold text-ink">{value}</div>
      <Delta now={now} before={before} unit={unit} />
    </div>
  )
}

export function MonthlyDiagnosis(): JSX.Element | null {
  const [sessions, setSessions] = useState<SessionWithBook[] | null>(null)
  const [month, setMonth] = useState<string>('')

  useEffect(() => {
    void window.readdeck.sessions.recent(5000).then(setSessions)
  }, [])

  const months = useMemo(() => (sessions ? monthsWithSessions(sessions) : []), [sessions])

  useEffect(() => {
    if (!month && months.length) setMonth(months[0])
  }, [months, month])

  const d: MonthDiagnosis | null = useMemo(
    () => (sessions && month ? diagnoseMonth(sessions, month) : null),
    [sessions, month]
  )

  if (!sessions) return null
  if (!months.length) {
    return (
      <div className="card p-5">
        <h3 className="mb-1 flex items-center gap-2 font-serif text-lg font-bold text-ink">
          <Stethoscope size={17} className="text-accent" /> Diagnóstico de leitura
        </h3>
        <p className="text-sm text-ink-soft">
          Registre suas primeiras sessões e o Sapien vai mostrar em que horário e em que dia
          você rende mais.
        </p>
      </div>
    )
  }
  if (!d) return null

  const maxHour = Math.max(...d.byHour, 1)
  const maxWeekday = Math.max(...d.byWeekday, 1)

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-serif text-lg font-bold text-ink">
          <Stethoscope size={17} className="text-accent" /> Diagnóstico de leitura
        </h3>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="field w-auto py-1.5 text-sm"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {label(m)}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-4 rounded-xl border border-accent/30 bg-accent/[0.06] p-3 text-sm italic text-ink-soft">
        {monthNarrative(d)}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Sessões" value={String(d.totals.sessions)} now={d.totals.sessions} before={d.previous.sessions} />
        <Metric label="Páginas" value={String(d.totals.pages)} now={d.totals.pages} before={d.previous.pages} />
        <Metric label="Tempo" value={fmtMin(d.totals.minutes)} now={d.totals.minutes} before={d.previous.minutes} unit="min" />
        <Metric label="Dias com leitura" value={String(d.totals.days)} now={d.totals.days} before={d.previous.days} unit="dias" />
      </div>

      {/* Onde ele rende mais */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <Clock size={15} className="text-ink-faint" />
            {d.bestHour ? (
              <>
                Você rende mais às <span className="text-accent">{d.bestHour.hour}h</span>
              </>
            ) : (
              'Seu melhor horário'
            )}
          </div>
          <div className="flex h-20 items-end gap-[2px]">
            {d.byHour.map((v, h) => (
              <div
                key={h}
                title={`${h}h — ${fmtMin(v)}`}
                style={{ height: `${Math.max(3, (v / maxHour) * 100)}%` }}
                className={`flex-1 rounded-sm ${
                  d.bestHour?.hour === h ? 'bg-accent' : v > 0 ? 'bg-accent/35' : 'bg-ink/10'
                }`}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-ink-faint">
            <span>0h</span>
            <span>6h</span>
            <span>12h</span>
            <span>18h</span>
            <span>23h</span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <CalendarCheck size={15} className="text-ink-faint" />
            {d.bestWeekday ? (
              <>
                Seu melhor dia é <span className="text-accent">{WEEKDAYS[d.bestWeekday.weekday]}</span>
              </>
            ) : (
              'Seu melhor dia da semana'
            )}
          </div>
          <div className="space-y-1.5">
            {d.byWeekday.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-[11px] text-ink-faint">{WEEKDAYS[i].slice(0, 3)}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                  <div
                    style={{ width: `${(v / maxWeekday) * 100}%` }}
                    className={`h-full rounded-full ${d.bestWeekday?.weekday === i ? 'bg-accent' : 'bg-accent/35'}`}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-[11px] text-ink-faint">{v ? fmtMin(v) : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {d.bestHour && (
        <p className="mt-4 text-xs text-ink-faint">
          Dica: você já leu {fmtMin(d.bestHour.minutes)} por volta das {d.bestHour.hour}h neste mês. Marcar
          sua leitura nesse horário na Agenda tende a funcionar melhor do que lutar contra a rotina.
        </p>
      )}
    </div>
  )
}
