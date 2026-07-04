import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { LoginScreen } from './components/LoginScreen'
import { useApp, type Section } from './store/app'
import type { AppHealth } from '../../shared/types'

const SECTION_TITLES: Record<Section, string> = {
  biblioteca: 'Biblioteca',
  lendo: 'Lendo agora',
  pomodoro: 'Pomodoro',
  metas: 'Metas',
  estatisticas: 'Estatísticas',
  notas: 'Notas'
}

function HealthCard(): JSX.Element {
  const [health, setHealth] = useState<AppHealth | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.readdeck
      .health()
      .then(setHealth)
      .catch((e) => setError(String(e)))
  }, [])

  return (
    <div className="card max-w-xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            health?.ok ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        />
        <h2 className="text-sm font-semibold text-ink">
          {health?.ok ? 'Banco de dados conectado' : 'Conectando ao banco...'}
        </h2>
      </div>

      {error && <p className="text-sm text-red-500">Erro: {error}</p>}

      {health && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-ink-faint">Versão</dt>
          <dd className="font-medium text-ink">ReadDeck {health.appVersion}</dd>
          <dt className="text-ink-faint">Livros no acervo</dt>
          <dd className="font-medium text-ink">{health.bookCount}</dd>
          <dt className="text-ink-faint">Arquivo do banco</dt>
          <dd className="truncate font-mono text-xs text-ink-soft" title={health.dbPath}>
            {health.dbPath}
          </dd>
        </dl>
      )}
    </div>
  )
}

function Placeholder({ section }: { section: Section }): JSX.Element {
  return (
    <div className="rounded-2xl border border-dashed border-edge p-8 text-sm text-ink-faint">
      A seção <span className="font-medium text-ink-soft">{SECTION_TITLES[section]}</span> chega
      numa das próximas fases. 🚧
    </div>
  )
}

function MainLayout(): JSX.Element {
  const section = useApp((s) => s.section)
  const name = useApp((s) => s.auth?.account?.name?.trim())

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center border-b border-edge bg-canvas/80 px-8 py-4 backdrop-blur">
          <h1 className="font-serif text-xl font-semibold tracking-tight text-ink">
            {SECTION_TITLES[section]}
          </h1>
        </header>

        <div className="space-y-6 px-8 py-8">
          {section === 'biblioteca' ? (
            <>
              <div className="space-y-3">
                <h2 className="font-serif text-3xl font-semibold tracking-tight text-ink">
                  {name ? `Olá, ${name}.` : 'Sua estante, do seu jeito.'}
                </h2>
                <p className="max-w-2xl text-[15px] leading-relaxed text-ink-soft">
                  Bem-vindo ao ReadDeck — seu gerenciador de leituras. A fundação está pronta:
                  janela, banco de dados local, login por e-mail e temas. Nas próximas fases entram
                  o cadastro de livros via Google Books, o leitor ativo, o Pomodoro, as metas e as
                  notas.
                </p>
              </div>
              <HealthCard />
            </>
          ) : (
            <Placeholder section={section} />
          )}
        </div>
      </main>
    </div>
  )
}

function App(): JSX.Element {
  const initAppearance = useApp((s) => s.initAppearance)
  const refreshAuth = useApp((s) => s.refreshAuth)
  const authReady = useApp((s) => s.authReady)
  const loggedIn = useApp((s) => s.auth?.loggedIn ?? false)

  useEffect(() => {
    void initAppearance()
    void refreshAuth()
  }, [initAppearance, refreshAuth])

  if (!authReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas text-sm text-ink-faint">
        Carregando…
      </div>
    )
  }

  return loggedIn ? <MainLayout /> : <LoginScreen />
}

export default App
