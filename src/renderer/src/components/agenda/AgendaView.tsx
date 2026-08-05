import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ScheduleSlotWithBook } from '../../../../shared/types'
import { useSchedule } from '../../store/schedule'
import { useBooks } from '../../store/books'
import { Modal } from '../ui/Modal'

// Agenda de leitura: os compromissos são semanais e recorrentes (dia + horário).
// Visualizações: Dia · Semana · Mês · Ano (12 meses de uma vez).

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAYS_MIN = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]
const HOUR_H = 52

type View = 'dia' | 'semana' | 'mes' | 'ano'

export function minToHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}
function hhmmToMin(v: string): number {
  const [h, m] = v.split(':').map((n) => parseInt(n, 10) || 0)
  return h * 60 + m
}
function fmtDur(min: number): string {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}
const sameDate = (a: Date, b: Date): boolean => a.toDateString() === b.toDateString()

interface Draft {
  id?: number
  weekday: number
  start: string
  duration: number
  bookId: number | null
  note: string
}

function SlotModal({ draft, onClose }: { draft: Draft | null; onClose: () => void }): JSX.Element | null {
  const books = useBooks((s) => s.books)
  const { add, edit, remove } = useSchedule()
  const [d, setD] = useState<Draft | null>(draft)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setD(draft)
    setErr(null)
  }, [draft])
  if (!d) return null

  async function save(): Promise<void> {
    if (!d) return
    setBusy(true)
    setErr(null)
    try {
      const payload = {
        weekday: d.weekday,
        start_min: hhmmToMin(d.start),
        duration_min: Math.max(5, d.duration),
        book_id: d.bookId,
        note: d.note.trim() || null
      }
      if (d.id) await edit(d.id, payload)
      else await add(payload)
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setErr(
        /schedule_slots|relation|does not exist|404/i.test(msg)
          ? 'A tabela da agenda ainda não existe no Supabase. Rode o supabase/schedule.sql.'
          : `Não foi possível salvar: ${msg}`
      )
    } finally {
      setBusy(false)
    }
  }

  async function del(): Promise<void> {
    if (!d?.id) return
    setBusy(true)
    try {
      await remove(d.id)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível excluir.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={d.id ? 'Editar horário' : 'Novo horário de leitura'}>
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">Dia da semana</span>
          <div className="flex flex-wrap gap-1.5">
            {DAYS_SHORT.map((label, i) => (
              <button
                key={label}
                onClick={() => setD({ ...d, weekday: i })}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  d.weekday === i
                    ? 'border-transparent bg-accent text-white'
                    : 'border-edge text-ink-soft hover:bg-ink/[0.05]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-ink-soft">Começa às</span>
            <input
              type="time"
              value={d.start}
              onChange={(e) => setD({ ...d, start: e.target.value })}
              className="field"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-ink-soft">Duração (min)</span>
            <input
              type="number"
              min={5}
              step={5}
              value={d.duration}
              onChange={(e) => setD({ ...d, duration: parseInt(e.target.value, 10) || 0 })}
              className="field"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Livro (opcional)</span>
          <select
            value={d.bookId ?? ''}
            onChange={(e) => setD({ ...d, bookId: e.target.value ? Number(e.target.value) : null })}
            className="field"
          >
            <option value="">Leitura livre</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Anotação (opcional)</span>
          <input
            value={d.note}
            onChange={(e) => setD({ ...d, note: e.target.value })}
            placeholder="Ex.: capítulo 4, antes de dormir"
            className="field"
          />
        </label>

        {err && <p className="text-xs text-red-500">{err}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
          {d.id ? (
            <button onClick={del} disabled={busy} className="btn-ghost py-1.5 text-sm text-red-500">
              <Trash2 size={14} /> Excluir
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} disabled={busy} className="btn-ghost py-1.5 text-sm">
              Cancelar
            </button>
            <button onClick={save} disabled={busy} className="btn-primary py-1.5 text-sm">
              {busy ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/** Grade de horas (usada pelas visões Dia e Semana). */
function HourGrid({
  columns,
  slotsFor,
  startHour,
  endHour,
  highlight,
  onCell,
  onSlot
}: {
  columns: { key: number; label: string; weekday: number }[]
  slotsFor: (weekday: number) => ScheduleSlotWithBook[]
  startHour: number
  endHour: number
  highlight: (weekday: number) => boolean
  onCell: (weekday: number, hour: number) => void
  onSlot: (s: ScheduleSlotWithBook) => void
}): JSX.Element {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const cols = `56px repeat(${columns.length}, 1fr)`

  return (
    <div className="card overflow-x-auto p-0">
      <div className={columns.length > 1 ? 'min-w-[720px]' : ''}>
        <div className="grid border-b border-edge" style={{ gridTemplateColumns: cols }}>
          <div />
          {columns.map((c) => (
            <div
              key={c.key}
              className={`px-2 py-2.5 text-center text-xs font-semibold ${
                highlight(c.weekday) ? 'text-accent' : 'text-ink-soft'
              }`}
            >
              {c.label}
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: cols }}>
          <div>
            {hours.map((h) => (
              <div key={h} style={{ height: HOUR_H }} className="relative border-b border-edge/50">
                <span className="absolute right-2 -top-2 text-[10px] text-ink-faint">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {columns.map((c) => (
            <div key={c.key} className="relative border-l border-edge/50">
              {hours.map((h) => (
                <button
                  key={h}
                  onClick={() => onCell(c.weekday, h)}
                  style={{ height: HOUR_H }}
                  className="block w-full border-b border-edge/50 transition-colors hover:bg-accent/[0.06]"
                  aria-label={`Adicionar leitura ${DAYS[c.weekday]} às ${h}:00`}
                />
              ))}
              {slotsFor(c.weekday).map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSlot(s)}
                  style={{
                    top: (s.start_min / 60 - startHour) * HOUR_H,
                    height: Math.max(22, (s.duration_min / 60) * HOUR_H - 3)
                  }}
                  className="absolute inset-x-1 overflow-hidden rounded-md border border-accent/40 bg-accent/20 px-1.5 py-1 text-left transition-colors hover:bg-accent/30"
                >
                  <span className="block truncate text-[10px] font-semibold text-ink">
                    {minToHHMM(s.start_min)} · {fmtDur(s.duration_min)}
                  </span>
                  <span className="block truncate text-[10px] text-ink-soft">
                    {s.book_title ?? s.note ?? 'Leitura'}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Matriz de semanas (datas) de um mês, começando no domingo. */
function monthMatrix(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  const weeks: Date[][] = []
  for (let w = 0; w < 6; w++) {
    const days: Date[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(start.getDate() + w * 7 + d)
      days.push(date)
    }
    weeks.push(days)
    const last = days[6]
    if (last.getMonth() !== month && last.getDate() >= 7) break
  }
  return weeks
}

export function AgendaView(): JSX.Element {
  const { slots, loading, error, load } = useSchedule()
  const loadBooks = useBooks((s) => s.load)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [view, setView] = useState<View>('semana')
  const today = new Date()
  const [dayIdx, setDayIdx] = useState(today.getDay())
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  useEffect(() => {
    void load()
    void loadBooks()
  }, [load, loadBooks])

  const byDay = useMemo(() => {
    const map: Record<number, ScheduleSlotWithBook[]> = {}
    for (let i = 0; i < 7; i++) map[i] = []
    for (const s of slots) map[s.weekday]?.push(s)
    return map
  }, [slots])

  const [startHour, endHour] = useMemo(() => {
    let min = 6
    let max = 23
    for (const s of slots) {
      min = Math.min(min, Math.floor(s.start_min / 60))
      max = Math.max(max, Math.ceil((s.start_min + s.duration_min) / 60))
    }
    return [Math.max(0, min), Math.min(24, Math.max(max, min + 4))]
  }, [slots])

  const totalMin = slots.reduce((s, x) => s + x.duration_min, 0)

  function openNew(weekday: number, hour: number): void {
    setDraft({ weekday, start: `${String(hour).padStart(2, '0')}:00`, duration: 30, bookId: null, note: '' })
  }
  function openSlot(s: ScheduleSlotWithBook): void {
    setDraft({
      id: s.id,
      weekday: s.weekday,
      start: minToHHMM(s.start_min),
      duration: s.duration_min,
      bookId: s.book_id,
      note: s.note ?? ''
    })
  }

  const VIEWS: { id: View; label: string }[] = [
    { id: 'dia', label: 'Dia' },
    { id: 'semana', label: 'Semana' },
    { id: 'mes', label: 'Mês' },
    { id: 'ano', label: 'Ano' }
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {slots.length === 0
            ? 'Planeje quando ler — os horários se repetem toda semana.'
            : `${slots.length} ${slots.length > 1 ? 'horários' : 'horário'} por semana · ${fmtDur(totalMin)} planejados`}
        </p>
        <button onClick={() => openNew(today.getDay(), 20)} className="btn-primary py-2 text-sm">
          <Plus size={15} /> Novo horário
        </button>
      </div>

      {/* Seletor de visualização + navegação */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v.id
                  ? 'border-transparent bg-accent text-white'
                  : 'border-edge text-ink-soft hover:bg-ink/[0.05]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {view === 'dia' && (
          <div className="flex flex-wrap gap-1.5">
            {DAYS_SHORT.map((d, i) => (
              <button
                key={d}
                onClick={() => setDayIdx(i)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  dayIdx === i
                    ? 'border-transparent bg-accent text-white'
                    : 'border-edge text-ink-soft hover:bg-ink/[0.05]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {view === 'mes' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="btn-ghost px-2 py-1"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[150px] text-center text-sm font-semibold text-ink">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </span>
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="btn-ghost px-2 py-1"
              aria-label="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {view === 'ano' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear() - 1, cursor.getMonth(), 1))}
              className="btn-ghost px-2 py-1"
              aria-label="Ano anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[70px] text-center text-sm font-semibold text-ink">
              {cursor.getFullYear()}
            </span>
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear() + 1, cursor.getMonth(), 1))}
              className="btn-ghost px-2 py-1"
              aria-label="Próximo ano"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/[0.06] p-3 text-sm text-ink-soft">
          {error} Rode o <code className="text-ink">supabase/schedule.sql</code> no SQL Editor do
          Supabase para ativar.
        </div>
      )}

      {loading && slots.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-faint">Carregando sua agenda…</p>
      ) : view === 'semana' ? (
        <HourGrid
          columns={DAYS.map((_, i) => ({ key: i, label: DAYS_SHORT[i], weekday: i }))}
          slotsFor={(w) => byDay[w] ?? []}
          startHour={startHour}
          endHour={endHour}
          highlight={(w) => w === today.getDay()}
          onCell={openNew}
          onSlot={openSlot}
        />
      ) : view === 'dia' ? (
        <HourGrid
          columns={[{ key: dayIdx, label: DAYS[dayIdx], weekday: dayIdx }]}
          slotsFor={(w) => byDay[w] ?? []}
          startHour={startHour}
          endHour={endHour}
          highlight={(w) => w === today.getDay()}
          onCell={openNew}
          onSlot={openSlot}
        />
      ) : view === 'mes' ? (
        <div className="card overflow-x-auto p-0">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 border-b border-edge">
              {DAYS_SHORT.map((d) => (
                <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-ink-soft">
                  {d}
                </div>
              ))}
            </div>
            {monthMatrix(cursor.getFullYear(), cursor.getMonth()).map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-edge/50 last:border-0">
                {week.map((date) => {
                  const inMonth = date.getMonth() === cursor.getMonth()
                  const daySlots = byDay[date.getDay()] ?? []
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => openNew(date.getDay(), 20)}
                      className={`min-h-[92px] border-l border-edge/50 p-1.5 text-left align-top transition-colors first:border-l-0 hover:bg-accent/[0.05] ${
                        inMonth ? '' : 'opacity-35'
                      }`}
                    >
                      <span
                        className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                          sameDate(date, today) ? 'bg-accent text-white' : 'text-ink-soft'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      <span className="block space-y-0.5">
                        {daySlots.slice(0, 3).map((s) => (
                          <span
                            key={s.id}
                            className="block truncate rounded bg-accent/20 px-1 py-0.5 text-[10px] text-ink"
                          >
                            {minToHHMM(s.start_min)} {s.book_title ?? 'Leitura'}
                          </span>
                        ))}
                        {daySlots.length > 3 && (
                          <span className="block text-[10px] text-ink-faint">
                            +{daySlots.length - 3}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Ano: os 12 meses de uma vez, marcando os dias com leitura.
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MONTHS.map((name, m) => (
            <div key={name} className="card p-3">
              <p className="mb-2 text-center text-xs font-semibold text-ink">{name}</p>
              <div className="grid grid-cols-7 gap-0.5">
                {DAYS_MIN.map((d, i) => (
                  <span key={i} className="text-center text-[9px] text-ink-faint">
                    {d}
                  </span>
                ))}
                {monthMatrix(cursor.getFullYear(), m).flat().map((date) => {
                  const inMonth = date.getMonth() === m
                  const has = (byDay[date.getDay()] ?? []).length > 0
                  return (
                    <span
                      key={date.toISOString()}
                      title={
                        has && inMonth
                          ? (byDay[date.getDay()] ?? [])
                              .map((s) => `${minToHHMM(s.start_min)} ${s.book_title ?? 'Leitura'}`)
                              .join(' · ')
                          : undefined
                      }
                      className={`flex h-5 items-center justify-center rounded text-[9.5px] ${
                        !inMonth
                          ? 'text-ink-faint/30'
                          : sameDate(date, today)
                            ? 'bg-accent font-bold text-white'
                            : has
                              ? 'bg-accent/25 font-semibold text-ink'
                              : 'text-ink-faint'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {slots.length === 0 && !loading && !error && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-edge p-4 text-sm text-ink-faint">
          <CalendarDays size={18} className="shrink-0" />
          Clique em qualquer horário da grade para marcar sua primeira leitura da semana.
        </div>
      )}

      <SlotModal draft={draft} onClose={() => setDraft(null)} />
    </div>
  )
}
