import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Sparkles, Send, KeyRound, Loader2, Trash2, ExternalLink } from 'lucide-react'
import { AI_MODELS } from '../../../../shared/types'
import { useAi } from '../../store/ai'

const EXAMPLES = [
  'Me dê ideias de livros de distopia interessantes e como o mercado avalia cada um',
  'O que, em síntese, fala o livro 1984 de George Orwell?',
  'Sou fã de Machado de Assis — por onde continuar depois de Dom Casmurro?',
  'Recomende fantasia adulta parecida com O Nome do Vento'
]

function KeySetup(): JSX.Element {
  const setKey = useAi((s) => s.setKey)
  const model = useAi((s) => s.status?.model)
  const setModel = useAi((s) => s.setModel)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!draft.trim()) return
    setSaving(true)
    await setKey(draft.trim())
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 py-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white">
          <Sparkles size={22} />
        </div>
        <h2 className="font-serif text-2xl font-semibold text-ink">Achar um livro</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Um assistente que fala só de livros: recomendações por gênero, sínteses e avaliações.
          Para usar, cole sua chave da <span className="font-medium">Claude API (Anthropic)</span>.
        </p>
      </div>

      <form onSubmit={save} className="card space-y-4 p-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">Chave de API</span>
          <div className="relative">
            <KeyRound
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="sk-ant-..."
              className="field pl-9 font-mono text-xs"
              autoFocus
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">Modelo</span>
          <select
            value={model}
            onChange={(e) => void setModel(e.target.value)}
            className="field"
          >
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.hint}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Salvando…' : 'Salvar e começar'}
        </button>
      </form>

      <p className="text-center text-xs leading-relaxed text-ink-faint">
        A chave fica só neste computador. Pegue a sua em{' '}
        <a
          href="https://console.anthropic.com/settings/keys"
          className="inline-flex items-center gap-0.5 text-accent hover:underline"
        >
          console.anthropic.com <ExternalLink size={11} />
        </a>
        . O uso é cobrado pela Anthropic conforme seu plano.
      </p>
    </div>
  )
}

function Chat(): JSX.Element {
  const { messages, sending, status, error, send, clear, setModel } = useAi()
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    const text = input
    setInput('')
    await send(text)
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <div className="flex items-center justify-between pb-3">
        <select
          value={status?.model}
          onChange={(e) => void setModel(e.target.value)}
          className="rounded-lg border border-edge bg-surface px-2.5 py-1.5 text-xs text-ink-soft outline-none"
        >
          {AI_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        {messages.length > 0 && (
          <button onClick={clear} className="btn-ghost px-2.5 py-1.5 text-xs">
            <Trash2 size={13} /> Limpar
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="space-y-4 py-6">
            <p className="text-sm text-ink-soft">
              Pergunte sobre livros — recomendações, sínteses, o que a crítica achou. Alguns
              exemplos:
            </p>
            <div className="flex flex-col gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => void send(ex)}
                  className="rounded-xl border border-edge bg-surface px-4 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-ink/[0.03]"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-accent text-white'
                  : 'border border-edge bg-surface text-ink'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex items-center gap-2 text-sm text-ink-faint">
            <Loader2 size={15} className="animate-spin" /> Pensando sobre livros…
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 pt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte sobre livros…"
          className="field"
          autoFocus
        />
        <button type="submit" disabled={sending || !input.trim()} className="btn-primary">
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}

export function FindBookView(): JSX.Element {
  const status = useAi((s) => s.status)
  const refreshStatus = useAi((s) => s.refreshStatus)

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  if (!status) {
    return <p className="py-16 text-center text-sm text-ink-faint">Carregando…</p>
  }
  return status.hasKey ? <Chat /> : <KeySetup />
}
