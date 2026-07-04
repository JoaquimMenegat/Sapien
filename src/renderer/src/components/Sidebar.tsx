import { useState } from 'react'
import {
  Library,
  BookOpen,
  Timer,
  Target,
  BarChart3,
  NotebookPen,
  LogOut,
  Sparkles,
  Tags,
  SlidersHorizontal
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp, type Section } from '../store/app'
import { AppearancePicker } from './AppearancePicker'
import { SettingsModal } from './SettingsModal'

const NAV: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'biblioteca', label: 'Biblioteca', icon: Library },
  { id: 'achar', label: 'Achar um livro', icon: Sparkles },
  { id: 'generos', label: 'Gêneros', icon: Tags },
  { id: 'lendo', label: 'Lendo agora', icon: BookOpen },
  { id: 'pomodoro', label: 'Pomodoro', icon: Timer },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'estatisticas', label: 'Estatísticas', icon: BarChart3 },
  { id: 'notas', label: 'Notas', icon: NotebookPen }
]

export function Sidebar(): JSX.Element {
  const section = useApp((s) => s.section)
  const setSection = useApp((s) => s.setSection)
  const account = useApp((s) => s.auth?.account)
  const logout = useApp((s) => s.logout)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const displayName = account?.name?.trim() || account?.email?.split('@')[0] || 'Leitor(a)'

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-edge bg-surface">
      <div className="flex items-center gap-2 px-4 pb-2 pt-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
          <Library size={16} />
        </div>
        <span className="font-serif text-[17px] font-semibold tracking-tight text-ink">
          Sapien
        </span>
      </div>

      <nav className="mt-2 flex flex-col gap-0.5 px-2">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`sidebar-item ${section === id ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-2.5 border-t border-edge px-3 py-3">
        <AppearancePicker />

        <button onClick={() => setSettingsOpen(true)} className="sidebar-item w-full">
          <SlidersHorizontal size={16} />
          <span>Personalização</span>
        </button>

        <div className="flex items-center gap-2 pt-0.5">
          {account?.picture ? (
            <img
              src={account.picture}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full border border-edge object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold uppercase text-accent">
              {displayName.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{displayName}</p>
            <p className="truncate text-xs text-ink-faint">{account?.email}</p>
          </div>
          <button
            onClick={() => void logout()}
            title="Sair"
            aria-label="Sair"
            className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </aside>
  )
}
