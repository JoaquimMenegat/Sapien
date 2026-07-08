import { useEffect } from 'react'
import { Topbar } from './components/Topbar'
import { LoginScreen } from './components/LoginScreen'
import { LibraryView } from './components/library/LibraryView'
import { FindBookView } from './components/ai/FindBookView'
import { GenresView } from './components/genres/GenresView'
import { AutoresView } from './components/authors/AutoresView'
import { ReadingView } from './components/reading/ReadingView'
import { StatsView } from './components/stats/StatsView'
import { PomodoroView } from './components/pomodoro/PomodoroView'
import { MetasView } from './components/goals/MetasView'
import { NotasView } from './components/notes/NotasView'
import { useApp, applyAppearance, loginAppearance, type Section } from './store/app'

const SECTION_TITLES: Record<Section, string> = {
  biblioteca: 'Biblioteca',
  achar: 'Achar um livro',
  generos: 'Gêneros',
  autores: 'Autores',
  lendo: 'Lendo agora',
  pomodoro: 'Sessão de leitura',
  metas: 'Metas',
  estatisticas: 'Estatísticas',
  notas: 'Notas'
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

  return (
    <div className="min-h-screen">
      <Topbar />
      <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-7 lg:px-10">
        {/* Biblioteca é um dashboard (lidera com KPIs); as demais telas têm título. */}
        {section !== 'biblioteca' && (
          <h1
            key={`${section}-title`}
            className="anim-fadeUp mb-6 font-serif text-[26px] font-bold tracking-tight text-ink"
          >
            {SECTION_TITLES[section]}
          </h1>
        )}

        {/* key={section} remonta o conteúdo e re-dispara a animação de entrada. */}
        <div key={section} className="view-enter">
          {section === 'biblioteca' ? (
            <LibraryView />
          ) : section === 'achar' ? (
            <FindBookView />
          ) : section === 'generos' ? (
            <GenresView />
          ) : section === 'autores' ? (
            <AutoresView />
          ) : section === 'lendo' ? (
            <ReadingView />
          ) : section === 'estatisticas' ? (
            <StatsView />
          ) : section === 'pomodoro' ? (
            <PomodoroView />
          ) : section === 'metas' ? (
            <MetasView />
          ) : section === 'notas' ? (
            <NotasView />
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
  const appearance = useApp((s) => s.appearance)

  useEffect(() => {
    void initAppearance()
    void refreshAuth()
  }, [initAppearance, refreshAuth])

  // A tela de login/cadastro é sempre escura; dentro do app usa a aparência salva.
  useEffect(() => {
    if (!authReady) return
    applyAppearance(loggedIn ? appearance : loginAppearance(appearance))
  }, [authReady, loggedIn, appearance])

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
