import { useState } from 'react'
import { ArrowLeft, Search, Check, Sparkles } from 'lucide-react'
import { useApp } from '../../store/app'
import { usePomodoro } from '../../store/pomodoro'
import type { GoogleBookResult } from '../../../../shared/types'
import { LogoLockup } from '../Logo'

// Onboarding de acolhimento: 6 perguntas → uma rotina inicial pronta.
// Aparece só para quem acabou de se cadastrar e não pode ser pulado (a última tela
// sempre oferece "Vou organizar pessoalmente", que não configura metas).

const PROFILES = [
  { id: 'retomando', label: 'Quero voltar a ler depois de uma pausa.' },
  { id: 'intermitente', label: 'Leio de vez em quando, mas perco a constância.' },
  { id: 'frequente', label: 'Já leio com frequência e quero acompanhar minha evolução.' },
  { id: 'iniciando', label: 'Estou começando a criar o hábito agora.' }
]

const OBJECTIVES = [
  { id: 'retomar', label: 'Retomar o hábito de leitura.' },
  { id: 'terminar', label: 'Terminar o livro que estou lendo.' },
  { id: 'regularidade', label: 'Ler com mais regularidade.' },
  { id: 'evolucao', label: 'Entender melhor minha evolução.' },
  { id: 'rotina', label: 'Criar uma rotina que caiba na minha semana.' }
]

const BARRIERS = [
  { id: 'tempo', label: 'Falta de tempo.' },
  { id: 'esqueco', label: 'Eu me esqueço de ler.' },
  { id: 'continuidade', label: 'Começo, mas não consigo continuar.' },
  { id: 'cansaco', label: 'Cansaço ou dificuldade de concentração.' },
  { id: 'metas', label: 'Metas muito difíceis.' },
  { id: 'rotina', label: 'Minha rotina muda constantemente.' },
  { id: 'horario', label: 'Ainda não encontrei um horário adequado.' }
]

const PERIODS = [
  { id: 'manha', label: 'Manhã' },
  { id: 'tarde', label: 'Tarde' },
  { id: 'noite', label: 'Noite' },
  { id: 'depende', label: 'Depende do dia' }
]

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
// Ordem de sugestão: espalha a semana começando por terça/quinta/domingo.
const SUGGESTION_ORDER = [2, 4, 0, 6, 1, 3, 5]

const TOTAL_STEPS = 6

function suggestDays(frequency: number): number[] {
  return SUGGESTION_ORDER.slice(0, frequency).sort((a, b) => a - b)
}

/** 45 → "45 minutos" · 60 → "1 hora" · 90 → "1h30" */
function fmtDuration(min: number): string {
  if (min < 60) return `${min} minutos`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (m === 0) return h === 1 ? '1 hora' : `${h} horas`
  return `${h}h${String(m).padStart(2, '0')}`
}

function Option({
  selected,
  onClick,
  children
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
        selected ? 'border-accent bg-accent/[0.08]' : 'border-edge hover:bg-ink/[0.04]'
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          selected ? 'border-accent bg-accent' : 'border-ink-faint'
        }`}
      >
        {selected && <Check size={11} className="text-white" strokeWidth={3} />}
      </span>
      <span className="text-sm text-ink">{children}</span>
    </button>
  )
}

function Chip({
  selected,
  onClick,
  children
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
        selected ? 'border-transparent bg-accent text-white' : 'border-edge text-ink-soft hover:bg-ink/[0.05]'
      }`}
    >
      {children}
    </button>
  )
}

export function OnboardingFlow(): JSX.Element {
  const finishOnboarding = useApp((s) => s.finishOnboarding)
  const setSection = useApp((s) => s.setSection)
  const setFocus = usePomodoro((s) => s.setFocus)

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Respostas
  const [profile, setProfile] = useState('')
  const [objective, setObjective] = useState('')
  const [barriers, setBarriers] = useState<string[]>([])
  const [frequency, setFrequency] = useState(0)
  const [duration, setDuration] = useState(0)
  const [customHours, setCustomHours] = useState('')
  const [customMinutes, setCustomMinutes] = useState('')
  const [organize, setOrganize] = useState('')
  const [days, setDays] = useState<number[]>([])
  const [period, setPeriod] = useState('')

  // Livro atual
  const [bookMode, setBookMode] = useState<'' | 'busca' | 'manual' | 'nenhum'>('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GoogleBookResult[]>([])
  const [searching, setSearching] = useState(false)
  const [chosen, setChosen] = useState<GoogleBookResult | null>(null)
  const [manualTitle, setManualTitle] = useState('')
  const [currentPage, setCurrentPage] = useState('')
  const [notStarted, setNotStarted] = useState(false)

  const bookTitle = chosen?.title || manualTitle.trim()
  const hasBook = bookMode === 'nenhum' ? false : !!bookTitle

  function toggleBarrier(id: string): void {
    setBarriers((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]))
  }
  function toggleDay(i: number): void {
    setDays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i]))
  }

  async function search(): Promise<void> {
    if (!query.trim()) return
    setSearching(true)
    try {
      setResults((await window.readdeck.books.search(query.trim())).slice(0, 6))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  // A rotina proposta a partir das respostas.
  const finalDuration =
    duration === -1
      ? (parseInt(customHours, 10) || 0) * 60 + (parseInt(customMinutes, 10) || 0)
      : duration
  const weeklyMinutes = frequency * finalDuration
  const routineDays = organize === 'days' && days.length ? [...days].sort((a, b) => a - b) : suggestDays(frequency)

  const canAdvance = [
    !!profile,
    !!objective,
    barriers.length > 0,
    bookMode === 'nenhum' || (!!bookTitle && (notStarted || currentPage !== '' || bookMode === 'manual')),
    frequency > 0 && finalDuration > 0,
    !!organize && (organize !== 'days' || (days.length > 0 && !!period))
  ][step]

  /** Salva as respostas e (se aceitar) grava metas + duração do pomodoro. */
  async function finish(accept: boolean): Promise<void> {
    setSaving(true)
    try {
      const set = window.readdeck.setSetting
      await Promise.all([
        set('onboarding.profile', profile),
        set('onboarding.objective', objective),
        set('onboarding.barriers', barriers.join(',')),
        set('onboarding.organize', organize),
        set('onboarding.days', routineDays.join(',')),
        set('onboarding.period', period)
      ])

      // Cria o livro atual, se houver.
      if (hasBook) {
        const page = notStarted ? 0 : Math.max(0, parseInt(currentPage, 10) || 0)
        await window.readdeck.books.create({
          ...(chosen ?? {}),
          title: bookTitle,
          status: 'lendo',
          current_page: page,
          started_at: new Date().toISOString().slice(0, 10)
        })
      }

      if (accept) {
        await Promise.all([
          window.readdeck.goals.set('sessoes_semana', frequency),
          window.readdeck.goals.set('minutos_semana', weeklyMinutes),
          set('pomodoro.focus', String(finalDuration))
        ])
        setFocus(finalDuration)
      }
    } catch {
      /* nunca travar a entrada por erro ao salvar preferências */
    } finally {
      await finishOnboarding()
      setSaving(false)
    }
  }

  async function finishAndStart(): Promise<void> {
    await finish(true)
    setFocus(10)
    setSection('pomodoro')
  }

  // ---- Telas ----

  const isResult = step === TOTAL_STEPS

  return (
    <div className="min-h-screen bg-canvas px-5 py-10">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-7 flex justify-center">
          <LogoLockup />
        </div>

        {!isResult && (
          <>
            <div className="mb-1.5 flex items-center justify-between text-xs text-ink-faint">
              <span>
                Pergunta {step + 1} de {TOTAL_STEPS}
              </span>
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="inline-flex items-center gap-1 transition-colors hover:text-ink"
                >
                  <ArrowLeft size={13} /> Voltar
                </button>
              )}
            </div>
            <div className="mb-6 h-1 overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </>
        )}

        <div key={step} className="view-enter card p-6">
          {step === 0 && (
            <>
              <h2 className="font-serif text-xl font-bold text-ink">
                Qual frase melhor descreve sua leitura hoje?
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Isso ajuda o Sapien a falar com você do jeito certo.
              </p>
              <div className="mt-5 space-y-2">
                {PROFILES.map((p) => (
                  <Option key={p.id} selected={profile === p.id} onClick={() => setProfile(p.id)}>
                    {p.label}
                  </Option>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-serif text-xl font-bold text-ink">
                O que você mais quer conquistar neste momento?
              </h2>
              <p className="mt-1 text-sm text-ink-soft">Escolha só um — o que mais importa agora.</p>
              <div className="mt-5 space-y-2">
                {OBJECTIVES.map((o) => (
                  <Option key={o.id} selected={objective === o.id} onClick={() => setObjective(o.id)}>
                    {o.label}
                  </Option>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-serif text-xl font-bold text-ink">
                O que mais costuma atrapalhar sua leitura?
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Escolha quantas quiser. Sem julgamento — só contexto.
              </p>
              <div className="mt-5 space-y-2">
                {BARRIERS.map((b) => {
                  const selected = barriers.includes(b.id)
                  return (
                    <button
                      key={b.id}
                      onClick={() => toggleBarrier(b.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                        selected ? 'border-accent bg-accent/[0.08]' : 'border-edge hover:bg-ink/[0.04]'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          selected ? 'border-accent bg-accent' : 'border-ink-faint'
                        }`}
                      >
                        {selected && <Check size={11} className="text-white" strokeWidth={3} />}
                      </span>
                      <span className="text-sm text-ink">{b.label}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-serif text-xl font-bold text-ink">O que você está lendo atualmente?</h2>
              <p className="mt-1 text-sm text-ink-soft">Assim seu painel já começa com vida.</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Chip selected={bookMode === 'busca'} onClick={() => setBookMode('busca')}>
                  Buscar pelo título
                </Chip>
                <Chip selected={bookMode === 'manual'} onClick={() => setBookMode('manual')}>
                  Cadastrar manualmente
                </Chip>
                <Chip
                  selected={bookMode === 'nenhum'}
                  onClick={() => {
                    setBookMode('nenhum')
                    setChosen(null)
                    setManualTitle('')
                  }}
                >
                  Ainda não estou lendo
                </Chip>
              </div>

              {bookMode === 'busca' && (
                <div className="mt-4">
                  <div className="flex gap-2">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void search()}
                      placeholder="Título do livro"
                      className="field"
                    />
                    <button onClick={search} disabled={searching} className="btn-ghost shrink-0">
                      <Search size={15} /> {searching ? '…' : 'Buscar'}
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {results.map((r) => (
                      <button
                        key={r.google_books_id}
                        onClick={() => setChosen(r)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                          chosen?.google_books_id === r.google_books_id
                            ? 'border-accent bg-accent/[0.08]'
                            : 'border-edge hover:bg-ink/[0.04]'
                        }`}
                      >
                        {r.cover_url ? (
                          <img src={r.cover_url} alt="" className="h-14 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-14 w-10 rounded bg-ink/10" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">{r.title}</span>
                          <span className="block truncate text-xs text-ink-faint">
                            {r.authors ?? 'Autor desconhecido'}
                            {r.total_pages ? ` · ${r.total_pages} pág.` : ''}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {bookMode === 'manual' && (
                <div className="mt-4">
                  <label className="mb-1 block text-xs font-medium text-ink-soft">Título do livro</label>
                  <input
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="Ex.: O nome do vento"
                    className="field"
                  />
                </div>
              )}

              {hasBook && (
                <div className="mt-5 border-t border-edge pt-4">
                  <p className="text-sm font-medium text-ink">Em que ponto da leitura você está?</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={currentPage}
                      disabled={notStarted}
                      onChange={(e) => setCurrentPage(e.target.value)}
                      placeholder="Página"
                      className="field w-28 disabled:opacity-40"
                    />
                    <Chip
                      selected={notStarted}
                      onClick={() => {
                        setNotStarted((v) => !v)
                        setCurrentPage('')
                      }}
                    >
                      Ainda não comecei
                    </Chip>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="font-serif text-xl font-bold text-ink">
                O que realmente caberia em uma semana normal?
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Não é sobre o ideal — é sobre o que cabe de verdade na sua rotina.
              </p>

              <p className="mt-5 text-sm font-medium text-ink">Quantas vezes por semana seria possível ler?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Chip key={n} selected={frequency === n} onClick={() => setFrequency(n)}>
                    {n === 5 ? '5 ou mais' : `${n} vez${n > 1 ? 'es' : ''}`}
                  </Chip>
                ))}
              </div>

              <p className="mt-5 text-sm font-medium text-ink">Quanto tempo caberia em cada leitura?</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {[10, 15, 20, 30].map((n) => (
                  <Chip key={n} selected={duration === n} onClick={() => setDuration(n)}>
                    {n} minutos
                  </Chip>
                ))}
                <Chip selected={duration === -1} onClick={() => setDuration(-1)}>
                  Outro
                </Chip>
              </div>

              {duration === -1 && (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-soft">Horas</span>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      value={customHours}
                      onChange={(e) => setCustomHours(e.target.value)}
                      placeholder="0"
                      className="field w-24 text-center"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-soft">Minutos</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(e.target.value)}
                      placeholder="0"
                      className="field w-24 text-center"
                    />
                  </label>
                  {finalDuration > 0 && (
                    <span className="pb-2.5 text-sm text-ink-faint">= {fmtDuration(finalDuration)}</span>
                  )}
                </div>
              )}

              {frequency > 0 && finalDuration > 0 && (
                <p className="mt-5 rounded-xl border border-accent/30 bg-accent/[0.06] p-3 text-sm text-ink-soft">
                  {frequency} {frequency > 1 ? 'leituras' : 'leitura'} de{' '}
                  <b className="text-ink">{fmtDuration(finalDuration)}</b> dão{' '}
                  <b className="text-ink">{fmtDuration(weeklyMinutes)} por semana</b>. Um começo
                  possível — dá para ajustar quando quiser.
                </p>
              )}
            </>
          )}

          {step === 5 && (
            <>
              <h2 className="font-serif text-xl font-bold text-ink">
                Como você prefere organizar sua leitura?
              </h2>
              <div className="mt-5 space-y-2">
                <Option selected={organize === 'days'} onClick={() => setOrganize('days')}>
                  Quero escolher dias específicos.
                </Option>
                <Option selected={organize === 'flexible'} onClick={() => setOrganize('flexible')}>
                  Prefiro uma meta semanal flexível.
                </Option>
                <Option selected={organize === 'suggest'} onClick={() => setOrganize('suggest')}>
                  Quero que o Sapien sugira uma rotina.
                </Option>
              </div>

              {organize === 'days' && (
                <div className="mt-5 border-t border-edge pt-4">
                  <p className="text-sm font-medium text-ink">
                    Em quais dias você costuma ter mais espaço para ler?
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DAY_SHORT.map((d, i) => (
                      <Chip key={d} selected={days.includes(i)} onClick={() => toggleDay(i)}>
                        {d}
                      </Chip>
                    ))}
                  </div>
                  <p className="mt-4 text-sm font-medium text-ink">Em qual período costuma ser mais fácil?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PERIODS.map((p) => (
                      <Chip key={p.id} selected={period === p.id} onClick={() => setPeriod(p.id)}>
                        {p.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {isResult && (
            <>
              <div className="mb-4 flex items-center gap-2 text-accent">
                <Sparkles size={18} />
                <span className="text-xs font-semibold uppercase tracking-wide">Tudo pronto</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-ink">Sua rotina inicial está pronta</h2>

              <dl className="mt-5 space-y-2.5 rounded-xl border border-edge p-4">
                <div className="flex justify-between gap-4">
                  <dt className="text-sm text-ink-soft">Meta</dt>
                  <dd className="text-sm font-semibold text-ink">
                    {frequency} {frequency > 1 ? 'sessões' : 'sessão'} por semana
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-sm text-ink-soft">Duração sugerida</dt>
                  <dd className="text-sm font-semibold text-ink">{fmtDuration(finalDuration)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-sm text-ink-soft">Meta semanal</dt>
                  <dd className="text-sm font-semibold text-ink">{fmtDuration(weeklyMinutes)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-sm text-ink-soft">
                    {organize === 'days' ? 'Dias preferidos' : 'Dias sugeridos'}
                  </dt>
                  <dd className="text-right text-sm font-semibold text-ink">
                    {routineDays.map((d) => DAY_NAMES[d].toLowerCase()).join(', ')}
                  </dd>
                </div>
                {hasBook && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-sm text-ink-soft">Livro atual</dt>
                    <dd className="text-right text-sm font-semibold text-ink">
                      {bookTitle}
                      {!notStarted && currentPage ? `, página ${currentPage}` : ''}
                    </dd>
                  </div>
                )}
              </dl>

              <p className="mt-3 text-center text-xs text-ink-faint">
                Você poderá ajustar tudo quando quiser.
              </p>

              <div className="mt-6 space-y-2">
                <button onClick={finishAndStart} disabled={saving} className="btn-primary w-full">
                  Começar agora com uma sessão de 10 minutos
                </button>
                <button
                  onClick={() => void finish(true)}
                  disabled={saving}
                  className="btn-ghost w-full justify-center"
                >
                  Salvar rotina e explorar o Sapien
                </button>
                <button
                  onClick={() => void finish(false)}
                  disabled={saving}
                  className="w-full py-2 text-center text-xs text-ink-faint transition-colors hover:text-ink-soft"
                >
                  Vou organizar pessoalmente
                </button>
              </div>
            </>
          )}
        </div>

        {!isResult && (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance}
            className="btn-primary mt-5 w-full disabled:opacity-40"
          >
            Continuar
          </button>
        )}
      </div>
    </div>
  )
}
