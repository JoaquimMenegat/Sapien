import { useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { LoginScreen } from './components/LoginScreen'
import { LibraryView } from './components/library/LibraryView'
import { FindBookView } from './components/ai/FindBookView'
import { GenresView } from './components/genres/GenresView'
import { ReadingView } from './components/reading/ReadingView'
import { StatsView } from './components/stats/StatsView'
import { PomodoroView } from './components/pomodoro/PomodoroView'
import { MetasView } from './components/goals/MetasView'
import { NotasView } from './components/notes/NotasView'
import { useApp, type Section } from './store/app'

const SECTION_TITLES: Record<Section, string> = {
  biblioteca: 'Biblioteca',
  achar: 'Achar um livro',
  generos: 'Gêneros',
  lendo: 'Lendo agora',
  pomodoro: 'Pomodoro',
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
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center border-b border-edge bg-canvas/80 px-8 py-4 backdrop-blur">
          <h1 className="font-serif text-xl font-semibold tracking-tight text-ink">
            {SECTION_TITLES[section]}
          </h1>
        </header>

        <div className="px-8 py-6">
          {section === 'biblioteca' ? (
            <LibraryView />
          ) : section === 'achar' ? (
            <FindBookView />
          ) : section === 'generos' ? (
            <GenresView />
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
