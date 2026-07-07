import { useState } from 'react'
import { Search, Plus, LogOut, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { useApp, type Section } from '../store/app'
import { LogoMark } from './Logo'
import { SettingsModal } from './SettingsModal'

const NAV: { id: Section; label: string }[] = [
  { id: 'biblioteca', label: 'Biblioteca' },
  { id: 'achar', label: 'Achar' },
  { id: 'generos', label: 'Gêneros' },
  { id: 'autores', label: 'Autores' },
  { id: 'lendo', label: 'Lendo' },
  { id: 'pomodoro', label: 'Sessão' },
  { id: 'metas', label: 'Metas' },
  { id: 'estatisticas', label: 'Stats' },
  { id: 'notas', label: 'Notas' }
]

export function Topbar(): JSX.Element {
  const section = useApp((s) => s.section)
  const setSection = useApp((s) => s.setSection)
  const setAddBookOpen = useApp((s) => s.setAddBookOpen)
  const account = useApp((s) => s.auth?.account)
  const logout = useApp((s) => s.logout)

  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const displayName = account?.name?.trim() || account?.email?.split('@')[0] || 'Leitor(a)'

  function openAdd(): void {
    setSection('biblioteca')
    setAddBookOpen(true)
  }

  return (
    <header className="sticky top-0 z-20 border-b border-edge bg-canvas/80 backdrop-blur-md">
      <div className="flex items-center gap-6 px-6 py-3 lg:px-10">
        {/* Marca */}
        <button
          onClick={() => setSection('biblioteca')}
          className="flex shrink-0 items-center gap-2.5"
          aria-label="Ir para a Biblioteca"
        >
          <LogoMark size={32} />
          <span className="font-extrabold tracking-tight text-ink" style={{ letterSpacing: '-0.02em' }}>
            Sapien
          </span>
        </button>

        {/* Navegação (rola horizontalmente se faltar espaço) */}
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setSection(n.id)}
              className={`nav-pill shrink-0 ${section === n.id ? 'active' : ''}`}
            >
              {n.label}
            </button>
          ))}
        </nav>

        {/* Ações à direita */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={openAdd}
            className="hidden items-center gap-2 rounded-[10px] border border-edge bg-surface px-3.5 py-2 text-[12.5px] text-ink-soft transition-colors hover:border-accent/60 hover:text-ink md:flex"
          >
            <Search size={14} /> Buscar livro…
          </button>
          <button onClick={openAdd} className="btn-primary pulse px-3.5 py-2 text-[12.5px]">
            <Plus size={15} /> <span className="hidden sm:inline">Adicionar livro</span>
          </button>

          {/* Perfil */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full pl-0.5 pr-1.5 transition-colors hover:bg-ink/[0.06]"
              aria-label="Conta"
            >
              {account?.picture ? (
                <img
                  src={account.picture}
                  alt=""
                  className="h-8 w-8 rounded-full border border-edge object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-xs font-bold uppercase text-[#c7d2fe]">
                  {displayName.slice(0, 2)}
                </div>
              )}
              <ChevronDown size={14} className="text-ink-faint" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="modal-in absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-edge bg-surface shadow-2xl">
                  <div className="border-b border-edge px-4 py-3">
                    <p className="truncate text-sm font-bold text-ink">{displayName}</p>
                    <p className="truncate text-xs text-ink-faint">{account?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSettingsOpen(true)
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/[0.06] hover:text-ink"
                  >
                    <SlidersHorizontal size={15} /> Personalização
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      void logout()
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/[0.06] hover:text-ink"
                  >
                    <LogOut size={15} /> Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  )
}
