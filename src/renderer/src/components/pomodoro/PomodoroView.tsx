import { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, BookMarked, Clock, Gauge, ListChecks } from 'lucide-react'
import { useBooks } from '../../store/books'
import { useSessions } from '../../store/sessions'
import { Modal } from '../ui/Modal'

type Mode = 'foco' | 'pausa'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function playBeep(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    o.frequency.value = 880
    g.gain.value = 0.06
    o.start()
    setTimeout(() => {
      o.stop()
      void ctx.close()
    }, 260)
  } catch {
    /* áudio indisponível — ignora */
  }
}

function StatCard({
  label,
  value,
  color
}: {
  label: string
  value: string | number
  color: string
}): JSX.Element {
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
  const { today, pace, recent, refresh, addSession } = useSessions()

  const [focusMin, setFocusMin] = useState(25)
  const [breakMin, setBreakMin] = useState(5)
  const [mode, setMode] = useState<Mode>('foco')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [bookId, setBookId] = useState<number | null>(null)

  // Modal de registro
  const [showRec, setShowRec] = useState(false)
  const [recBook, setRecBook] = useState<number | null>(null)
  const [recPages, setRecPages] = useState('')
  const [recHours, setRecHours] = useState('')
  const [recMins, setRecMins] = useState('')
  const [saving, setSaving] = useState(false)

  const tickRef = useRef<number | null>(null)

  // No Pomodoro só faz sentido registrar sessões dos livros que estão em leitura.
  const readingBooks = books.filter((b) => b.status === 'lendo')

  // Inicialização (uma vez).
  useEffect(() => {
    void load()
    void refresh()
    void window.readdeck.getSetting('pomodoro.focus').then((v) => {
      const n = v ? parseInt(v, 10) : NaN
      if (Number.isFinite(n) && n > 0) {
        setFocusMin(n)
        setSecondsLeft(n * 60)
      }
    })
    void window.readdeck.getSetting('pomodoro.break').then((v) => {
      const n = v ? parseInt(v, 10) : NaN
      if (Number.isFinite(n) && n > 0) setBreakMin(n)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Livro padrão = primeiro em leitura.
  useEffect(() => {
    if (bookId == null) {
      const reading = books.filter((b) => b.status === 'lendo')
      if (reading.length) setBookId(reading[0].id)
    }
  }, [books, bookId])

  // Tique do relógio.
  useEffect(() => {
    if (!running) return
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
    }
  }, [running])

  // Fim do contador.
  useEffect(() => {
    if (!running || secondsLeft > 0) return
    setRunning(false)
    playBeep()
    if (mode === 'foco') openRecord(focusMin)
    else switchMode('foco')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running])

  function total(m: Mode): number {
    return (m === 'foco' ? focusMin : breakMin) * 60
  }
  function switchMode(m: Mode): void {
    setMode(m)
    setRunning(false)
    setSecondsLeft(total(m))
  }
  function setFocus(n: number): void {
    const v = Math.max(1, n || 0)
    setFocusMin(v)
    void window.readdeck.setSetting('pomodoro.focus', String(v))
    if (mode === 'foco' && !running) setSecondsLeft(v * 60)
  }
  function setBreak(n: number): void {
    const v = Math.max(1, n || 0)
    setBreakMin(v)
    void window.readdeck.setSetting('pomodoro.break', String(v))
    if (mode === 'pausa' && !running) setSecondsLeft(v * 60)
  }

  function openRecord(minutes: number): void {
    const mins = Math.max(1, Math.round(minutes))
    setRecBook(bookId)
    setRecHours(mins >= 60 ? String(Math.floor(mins / 60)) : '')
    setRecMins(String(mins % 60))
    setRecPages(pace ? String(Math.max(1, Math.round((pace * minutes) / 60))) : '')
    setShowRec(true)
  }
  function endAndRecord(): void {
    setRunning(false)
    openRecord(Math.max(1, focusMin - secondsLeft / 60))
  }
  async function saveSession(): Promise<void> {
    if (!recBook) return
    const duration = (parseInt(recHours, 10) || 0) * 60 + (parseInt(recMins, 10) || 0)
    setSaving(true)
    await addSession(recBook, duration, parseInt(recPages, 10) || 0)
    setSaving(false)
    setShowRec(false)
    switchMode('pausa')
  }

  const progress = 1 - secondsLeft / Math.max(1, total(mode))

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Timer */}
      <div className="card flex flex-col items-center p-8">
        <div className="mb-6 flex items-center gap-1 rounded-full border border-edge bg-surface p-1 text-sm">
          {(['foco', 'pausa'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
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
          <span className="font-mono text-5xl font-semibold tabular-nums text-ink">
            {fmt(secondsLeft)}
          </span>
        </div>

        <div className="mt-7 flex items-center gap-2">
          <button onClick={() => setRunning((r) => !r)} className="btn-primary px-6">
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? 'Pausar' : 'Iniciar'}
          </button>
          <button onClick={() => switchMode(mode)} className="btn-ghost" title="Reiniciar">
            <RotateCcw size={16} />
          </button>
          {mode === 'foco' && (
            <button onClick={endAndRecord} className="btn-ghost">
              <BookMarked size={15} /> Encerrar e registrar
            </button>
          )}
        </div>

        <div className="mt-7 grid w-full max-w-md grid-cols-2 gap-3 border-t border-edge pt-5 text-sm">
          <label className="flex items-center justify-between gap-2">
            <span className="text-ink-soft">Livro</span>
            <select
              value={bookId ?? ''}
              onChange={(e) => setBookId(e.target.value ? Number(e.target.value) : null)}
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
                onChange={(e) => setFocus(parseInt(e.target.value, 10))}
                className="w-14 rounded-md border border-edge bg-elevated px-2 py-1 text-right text-ink outline-none"
              />
            </label>
            <label className="flex items-center gap-1.5">
              Pausa
              <input
                type="number"
                min={1}
                value={breakMin}
                onChange={(e) => setBreak(parseInt(e.target.value, 10))}
                className="w-14 rounded-md border border-edge bg-elevated px-2 py-1 text-right text-ink outline-none"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Lateral: hoje + recentes */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Sessões hoje" value={today?.sessions ?? 0} color="#3b82f6" />
          <StatCard label="Páginas hoje" value={today?.pages ?? 0} color="#10b981" />
          <StatCard label="Minutos hoje" value={today?.minutes ?? 0} color="#8b5cf6" />
          <StatCard label="Ritmo medido" value={pace ? `${pace} pág/h` : '—'} color="#f59e0b" />
        </div>

        <div className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-serif text-base font-semibold text-ink">
            <ListChecks size={16} className="text-ink-faint" /> Sessões recentes
          </h2>
          {recent.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-faint">
              Nenhuma sessão ainda. Inicie um Pomodoro e registre suas páginas.
            </p>
          ) : (
            <ul className="space-y-2">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-ink">{s.book_title}</span>
                  <span className="shrink-0 text-ink-soft">
                    {s.pages_read} pág · {s.duration_min} min
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal open={showRec} onClose={() => setShowRec(false)} title="Registrar sessão de leitura">
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">Livro</span>
            <select
              value={recBook ?? ''}
              onChange={(e) => setRecBook(e.target.value ? Number(e.target.value) : null)}
              className="field"
            >
              {readingBooks.length === 0 && <option value="">Nenhum livro em leitura</option>}
              {readingBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-soft">Páginas lidas</span>
              <input
                type="number"
                min={0}
                value={recPages}
                onChange={(e) => setRecPages(e.target.value)}
                className="field"
                autoFocus
              />
            </div>
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                <Clock size={12} /> Horas
              </span>
              <input
                type="number"
                min={0}
                value={recHours}
                onChange={(e) => setRecHours(e.target.value)}
                placeholder="0"
                className="field"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-soft">Minutos</span>
              <input
                type="number"
                min={0}
                max={59}
                value={recMins}
                onChange={(e) => setRecMins(e.target.value)}
                placeholder="0"
                className="field"
              />
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-ink-faint">
            <Gauge size={12} /> Isso avança o progresso do livro e passa a medir seu ritmo de
            leitura.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowRec(false)} className="btn-ghost">
              Agora não
            </button>
            <button onClick={saveSession} disabled={saving || !recBook} className="btn-primary">
              {saving ? 'Salvando…' : 'Salvar sessão'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
