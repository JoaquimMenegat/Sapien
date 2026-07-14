import { useEffect, useState } from 'react'
import { Play, Pause, RotateCcw, BookMarked, ListChecks, Clock, Trash2, Pencil } from 'lucide-react'
import type { SessionWithBook } from '../../../../shared/types'
import { useBooks } from '../../store/books'
import { useSessions } from '../../store/sessions'
import { usePomodoro, type Mode } from '../../store/pomodoro'
import { Modal } from '../ui/Modal'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function dayShort(iso: string): string {
  const d = iso.slice(0, 10).split('-')
  return d.length === 3 ? `${d[2]}/${d[1]}` : iso
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }): JSX.Element {
  return (
    <div className="rounded-xl border p-3.5" style={{ backgroundColor: `${color}14`, borderColor: `${color}33` }}>
      <p className="text-xs font-medium" style={{ color }}>
        {label}
      </p>
      <p className="mt-0.5 font-serif text-xl font-semibold text-ink">{value}</p>
    </div>
  )
}

export function PomodoroView(): JSX.Element {
  const books = useBooks((s) => s.books)
  const load = useBooks((s) => s.load)
  const today = useSessions((s) => s.today)
  const pace = useSessions((s) => s.pace)
  const recent = useSessions((s) => s.recent)
  const refresh = useSessions((s) => s.refresh)
  const updateSession = useSessions((s) => s.updateSession)
  const removeSession = useSessions((s) => s.removeSession)

  // Timer vem do store global (continua rodando fora desta aba).
  const focusMin = usePomodoro((s) => s.focusMin)
  const breakMin = usePomodoro((s) => s.breakMin)
  const mode = usePomodoro((s) => s.mode)
  const secondsLeft = usePomodoro((s) => s.secondsLeft)
  const running = usePomodoro((s) => s.running)
  const bookId = usePomodoro((s) => s.bookId)

  const readingBooks = books.filter((b) => b.status === 'lendo')

  // Modal de edição de uma sessão do histórico.
  const [editing, setEditing] = useState<SessionWithBook | null>(null)
  const [edBook, setEdBook] = useState<number | null>(null)
  const [edPages, setEdPages] = useState('')
  const [edHours, setEdHours] = useState('')
  const [edMins, setEdMins] = useState('')
  const [edSaving, setEdSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    void load()
    void refresh()
    void usePomodoro.getState().init()
  }, [load, refresh])

  const total = (mode === 'foco' ? focusMin : breakMin) * 60
  const progress = 1 - secondsLeft / Math.max(1, total)

  function openEdit(s: SessionWithBook): void {
    setEditing(s)
    setEdBook(s.book_id)
    setEdPages(String(s.pages_read))
    setEdHours(s.duration_min >= 60 ? String(Math.floor(s.duration_min / 60)) : '')
    setEdMins(String(s.duration_min % 60))
    setConfirmDel(false)
  }
  async function saveEdit(): Promise<void> {
    if (!editing) return
    const duration = (parseInt(edHours, 10) || 0) * 60 + (parseInt(edMins, 10) || 0)
    setEdSaving(true)
    await updateSession(editing.id, {
      book_id: edBook ?? undefined,
      pages_read: parseInt(edPages, 10) || 0,
      duration_min: duration
    })
    setEdSaving(false)
    setEditing(null)
  }
  async function deleteEdit(): Promise<void> {
    if (!editing) return
    await removeSession(editing.id)
    setEditing(null)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* Timer */}
      <div className="card flex flex-col items-center p-8">
        <div className="mb-6 flex items-center gap-1 rounded-full border border-edge bg-surface p-1 text-sm">
          {(['foco', 'pausa'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => usePomodoro.getState().switchMode(m)}
              className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
                mode === m ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {m === 'foco' ? 'Foco' : 'Pausa'}
            </button>
          ))}
        </div>

        <div className="relative flex h-56 w-56 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgb(var(--c-edge))" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgb(var(--c-accent))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 45}
              strokeDashoffset={2 * Math.PI * 45 * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <span className="font-mono text-5xl font-semibold tabular-nums text-ink">{fmt(secondsLeft)}</span>
        </div>

        <div className="mt-7 flex items-center gap-2">
          <button onClick={() => usePomodoro.getState().toggleRun()} className="btn-primary px-6">
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? 'Pausar' : 'Iniciar'}
          </button>
          <button onClick={() => usePomodoro.getState().reset()} className="btn-ghost" title="Reiniciar">
            <RotateCcw size={16} />
          </button>
          {mode === 'foco' && (
            <button onClick={() => usePomodoro.getState().endAndRecord()} className="btn-ghost">
              <BookMarked size={15} /> Encerrar e registrar
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-ink-faint">
          O timer continua rodando mesmo se você navegar para outras seções.
        </p>

        <div className="mt-4 grid w-full max-w-md grid-cols-2 gap-3 border-t border-edge pt-5 text-sm">
          <label className="flex items-center justify-between gap-2">
            <span className="text-ink-soft">Livro</span>
            <select
              value={bookId ?? ''}
              onChange={(e) => usePomodoro.getState().setBookId(e.target.value ? Number(e.target.value) : null)}
              className="field h-9 flex-1 py-1"
            >
              {readingBooks.length === 0 && <option value="">Nenhum livro em leitura</option>}
              {readingBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center justify-end gap-3 text-ink-soft">
            <label className="flex items-center gap-1.5">
              Foco
              <input
                type="number"
                min={1}
                value={focusMin}
                onChange={(e) => usePomodoro.getState().setFocus(parseInt(e.target.value, 10))}
                className="w-14 rounded-md border border-edge bg-elevated px-2 py-1 text-right text-ink outline-none"
              />
            </label>
            <label className="flex items-center gap-1.5">
              Pausa
              <input
                type="number"
                min={1}
                value={breakMin}
                onChange={(e) => usePomodoro.getState().setBreak(parseInt(e.target.value, 10))}
                className="w-14 rounded-md border border-edge bg-elevated px-2 py-1 text-right text-ink outline-none"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Lateral: hoje + histórico editável */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Sessões hoje" value={today?.sessions ?? 0} color="#3b82f6" />
          <StatCard label="Páginas hoje" value={today?.pages ?? 0} color="#10b981" />
          <StatCard label="Minutos hoje" value={today?.minutes ?? 0} color="#8b5cf6" />
          <StatCard label="Ritmo medido" value={pace ? `${pace} pág/h` : '—'} color="#f59e0b" />
        </div>

        <div className="card p-4">
          <h2 className="mb-1 flex items-center gap-2 font-serif text-base font-semibold text-ink">
            <ListChecks size={16} className="text-ink-faint" /> Histórico de sessões
          </h2>
          <p className="mb-3 text-xs text-ink-faint">Clique numa sessão para editar ou excluir.</p>
          {recent.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-faint">
              Nenhuma sessão ainda. Inicie um Pomodoro e registre suas páginas.
            </p>
          ) : (
            <ul className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
              {recent.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => openEdit(s)}
                    className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-ink/[0.05]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-ink">{s.book_title}</div>
                      <div className="text-xs text-ink-faint">{dayShort(s.started_at)}</div>
                    </div>
                    <span className="shrink-0 text-ink-soft">
                      {s.pages_read} pág · {s.duration_min} min
                    </span>
                    <Pencil size={13} className="shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal de edição de sessão */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar sessão">
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">Livro</span>
            <select
              value={edBook ?? ''}
              onChange={(e) => setEdBook(e.target.value ? Number(e.target.value) : null)}
              className="field"
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-soft">Páginas lidas</span>
              <input type="number" min={0} value={edPages} onChange={(e) => setEdPages(e.target.value)} className="field" />
            </div>
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                <Clock size={12} /> Horas
              </span>
              <input type="number" min={0} value={edHours} onChange={(e) => setEdHours(e.target.value)} placeholder="0" className="field" />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-soft">Minutos</span>
              <input type="number" min={0} max={59} value={edMins} onChange={(e) => setEdMins(e.target.value)} placeholder="0" className="field" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {confirmDel ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink-soft">Excluir?</span>
                <button onClick={deleteEdit} className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600">
                  Sim
                </button>
                <button onClick={() => setConfirmDel(false)} className="btn-ghost py-1.5">
                  Não
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDel(true)}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-500/10"
              >
                <Trash2 size={15} /> Excluir
              </button>
            )}
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="btn-ghost">
                Cancelar
              </button>
              <button onClick={saveEdit} disabled={edSaving} className="btn-primary">
                {edSaving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
