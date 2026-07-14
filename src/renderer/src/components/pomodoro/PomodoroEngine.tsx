import { useEffect } from 'react'
import { Play, Pause, Square, Maximize2, Clock, Gauge } from 'lucide-react'
import { usePomodoro } from '../../store/pomodoro'
import { useBooks } from '../../store/books'
import { useApp } from '../../store/app'
import { Modal } from '../ui/Modal'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function playBeep(): void {
  try {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
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

// Motor do Pomodoro: montado uma vez (no MainLayout). Roda o tique mesmo fora da
// aba Sessão, mostra o widget flutuante quando há sessão ativa e é dono do modal
// de registro (portal → aparece sobre qualquer tela).
export function PomodoroEngine(): JSX.Element {
  const books = useBooks((s) => s.books)
  const section = useApp((s) => s.section)
  const setSection = useApp((s) => s.setSection)

  const running = usePomodoro((s) => s.running)
  const secondsLeft = usePomodoro((s) => s.secondsLeft)
  const mode = usePomodoro((s) => s.mode)
  const bookId = usePomodoro((s) => s.bookId)
  const endedAt = usePomodoro((s) => s.endedAt)
  const focusMin = usePomodoro((s) => s.focusMin)
  const breakMin = usePomodoro((s) => s.breakMin)

  const showRec = usePomodoro((s) => s.showRec)
  const recBook = usePomodoro((s) => s.recBook)
  const recPages = usePomodoro((s) => s.recPages)
  const recHours = usePomodoro((s) => s.recHours)
  const recMins = usePomodoro((s) => s.recMins)
  const saving = usePomodoro((s) => s.saving)

  const readingBooks = books.filter((b) => b.status === 'lendo')

  useEffect(() => {
    void usePomodoro.getState().init()
  }, [])

  // Livro padrão = primeiro em leitura.
  useEffect(() => {
    if (bookId == null && readingBooks.length) usePomodoro.getState().setBookId(readingBooks[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, bookId])

  // Tique: um único setInterval, ativo enquanto running=true (independe da tela montada).
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => usePomodoro.getState().tick(), 1000)
    return () => window.clearInterval(id)
  }, [running])

  useEffect(() => {
    if (endedAt) playBeep()
  }, [endedAt])

  const total = (mode === 'foco' ? focusMin : breakMin) * 60
  const active = running || (secondsLeft > 0 && secondsLeft < total)
  const showWidget = active && section !== 'pomodoro'
  const book = books.find((b) => b.id === bookId)

  return (
    <>
      {showWidget && (
        <div className="modal-in fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-edge bg-surface/95 px-3 py-2 shadow-2xl backdrop-blur">
          <button
            onClick={() => setSection('pomodoro')}
            className="flex items-center gap-2 pl-1"
            title="Abrir a sessão"
          >
            {running ? (
              <span
                className="h-2 w-2 rounded-full bg-emerald-400"
                style={{ animation: 'tickPulse 1.4s ease-in-out infinite' }}
              />
            ) : (
              <Clock size={14} className="text-ink-faint" />
            )}
            <span className="max-w-[170px] truncate text-sm font-medium text-ink">
              {book?.title ?? (mode === 'foco' ? 'Foco' : 'Pausa')}
            </span>
          </button>
          <span className="font-mono text-lg font-semibold tabular-nums text-ink">{fmt(secondsLeft)}</span>
          <button
            onClick={() => usePomodoro.getState().toggleRun()}
            className="grid h-8 w-8 place-items-center rounded-full bg-accent text-white transition-transform hover:scale-105"
            title={running ? 'Pausar' : 'Continuar'}
          >
            {running ? <Pause size={15} /> : <Play size={15} />}
          </button>
          {mode === 'foco' && (
            <button
              onClick={() => usePomodoro.getState().endAndRecord()}
              className="grid h-8 w-8 place-items-center rounded-full border border-edge text-ink-soft transition-colors hover:text-ink"
              title="Encerrar e registrar"
            >
              <Square size={12} />
            </button>
          )}
          <button
            onClick={() => setSection('pomodoro')}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-faint transition-colors hover:text-ink"
            title="Abrir a sessão"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      )}

      <Modal open={showRec} onClose={() => usePomodoro.getState().closeRec()} title="Registrar sessão de leitura">
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">Livro</span>
            <select
              value={recBook ?? ''}
              onChange={(e) => usePomodoro.getState().setRecBook(e.target.value ? Number(e.target.value) : null)}
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
                onChange={(e) => usePomodoro.getState().setRecPages(e.target.value)}
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
                onChange={(e) => usePomodoro.getState().setRecHours(e.target.value)}
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
                onChange={(e) => usePomodoro.getState().setRecMins(e.target.value)}
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
            <button onClick={() => usePomodoro.getState().closeRec()} className="btn-ghost">
              Agora não
            </button>
            <button
              onClick={() => void usePomodoro.getState().save()}
              disabled={saving || !recBook}
              className="btn-primary"
            >
              {saving ? 'Salvando…' : 'Salvar sessão'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
