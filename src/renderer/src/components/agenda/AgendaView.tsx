import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, CalendarDays } from 'lucide-react'
import type { ScheduleSlotWithBook } from '../../../../shared/types'
import { useSchedule } from '../../store/schedule'
import { useBooks } from '../../store/books'
import { Modal } from '../ui/Modal'

// Agenda de leitura: grade semanal recorrente, no espírito do Google Agenda.
// Cada bloco é um compromisso que se repete toda semana (dia + horário + livro).

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOUR_H = 52 // altura de uma hora, em px

export function minToHHMM(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
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

interface Draft {
  id?: number
  weekday: number
  start: string
  duration: number
  bookId: number | null
  note: string
}

function SlotModal({
  draft,
  onClose
}: {
  draft: Draft | null
  onClose: () => void
}): JSX.Element | null {
  const books = useBooks((s) => s.books)
  const { add, edit, remove } = useSchedule()
  const [d, setD] = useState<Draft | null>(draft)
  const [busy, setBusy] = useState(false)

  useEffect(() => setD(draft), [draft])
  if (!d) return null

  async function save(): Promise<void> {
    if (!d) return
    setBusy(true)
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

export function AgendaView(): JSX.Element {
  const { slots, loading, error, load } = useSchedule()
  const loadBooks = useBooks((s) => s.load)
  const [draft, setDraft] = useState<Draft | null>(null)

  useEffect(() => {
    void load()
    void loadBooks()
  }, [load, loadBooks])

  // Faixa de horas exibida: cobre os compromissos, com 6h–23h como base.
  const [startHour, endHour] = useMemo(() => {
    let min = 6
    let max = 23
    for (const s of slots) {
      min = Math.min(min, Math.floor(s.start_min / 60))
      max = Math.max(max, Math.ceil((s.start_min + s.duration_min) / 60))
    }
    return [Math.max(0, min), Math.min(24, Math.max(max, min + 4))]
  }, [slots])

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const byDay = useMemo(() => {
    const map: Record<number, ScheduleSlotWithBook[]> = {}
    for (let i = 0; i < 7; i++) map[i] = []
    for (const s of slots) map[s.weekday]?.push(s)
    return map
  }, [slots])

  const totalMin = slots.reduce((sum, s) => sum + s.duration_min, 0)
  const todayIdx = new Date().getDay()

  function openNew(weekday: number, hour: number): void {
    setDraft({ weekday, start: `${String(hour).padStart(2, '0')}:00`, duration: 30, bookId: null, note: '' })
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {slots.length === 0
            ? 'Planeje quando ler — os horários se repetem toda semana.'
            : `${slots.length} ${slots.length > 1 ? 'horários' : 'horário'} por semana · ${fmtDur(totalMin)} planejados`}
        </p>
        <button onClick={() => openNew(todayIdx, 20)} className="btn-primary py-2 text-sm">
          <Plus size={15} /> Novo horário
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/[0.06] p-3 text-sm text-ink-soft">
          {error}
        </div>
      )}

      {loading && slots.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-faint">Carregando sua agenda…</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <div className="min-w-[720px]">
            {/* Cabeçalho dos dias */}
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-edge">
              <div />
              {DAYS.map((d, i) => (
                <div
                  key={d}
                  className={`px-2 py-2.5 text-center text-xs font-semibold ${
                    i === todayIdx ? 'text-accent' : 'text-ink-soft'
                  }`}
                >
                  {DAYS_SHORT[i]}
                </div>
              ))}
            </div>

            {/* Grade */}
            <div className="grid grid-cols-[56px_repeat(7,1fr)]">
              {/* Coluna das horas */}
              <div>
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_H }}
                    className="relative border-b border-edge/50 pr-2 text-right"
                  >
                    <span className="absolute right-2 -top-2 text-[10px] text-ink-faint">
                      {String(h).padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Uma coluna por dia */}
              {DAYS.map((day, i) => (
                <div key={day} className="relative border-l border-edge/50">
                  {hours.map((h) => (
                    <button
                      key={h}
                      onClick={() => openNew(i, h)}
                      style={{ height: HOUR_H }}
                      className="block w-full border-b border-edge/50 transition-colors hover:bg-accent/[0.06]"
                      aria-label={`Adicionar leitura ${DAYS[i]} às ${h}:00`}
                    />
                  ))}

                  {byDay[i].map((s) => {
                    const top = (s.start_min / 60 - startHour) * HOUR_H
                    const height = Math.max(22, (s.duration_min / 60) * HOUR_H - 3)
                    return (
                      <button
                        key={s.id}
                        onClick={() =>
                          setDraft({
                            id: s.id,
                            weekday: s.weekday,
                            start: minToHHMM(s.start_min),
                            duration: s.duration_min,
                            bookId: s.book_id,
                            note: s.note ?? ''
                          })
                        }
                        style={{ top, height }}
                        className="absolute inset-x-1 overflow-hidden rounded-md border border-accent/40 bg-accent/20 px-1.5 py-1 text-left transition-colors hover:bg-accent/30"
                      >
                        <span className="block truncate text-[10px] font-semibold text-ink">
                          {minToHHMM(s.start_min)} · {fmtDur(s.duration_min)}
                        </span>
                        <span className="block truncate text-[10px] text-ink-soft">
                          {s.book_title ?? s.note ?? 'Leitura'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
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
