import { Library, BookOpen, Timer, Target, BarChart3, NotebookPen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp, type Section } from '../store/app'
import { ThemeToggle } from './ThemeToggle'

const NAV: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'biblioteca', label: 'Biblioteca', icon: Library },
  { id: 'lendo', label: 'Lendo agora', icon: BookOpen },
  { id: 'pomodoro', label: 'Pomodoro', icon: Timer },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'estatisticas', label: 'Estatísticas', icon: BarChart3 },
  { id: 'notas', label: 'Notas', icon: NotebookPen }
]

export function Sidebar(): JSX.Element {
  const section = useApp((s) => s.section)
  const setSection = useApp((s) => s.setSection)

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-edge-light bg-surface-light dark:border-edge-dark dark:bg-surface-dark">
      <div className="flex items-center gap-2 px-4 pb-2 pt-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-clay text-white">
          <Library size={16} />
        </div>
        <span className="font-serif text-[17px] font-semibold tracking-tight">ReadDeck</span>
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

      <div className="mt-auto border-t border-edge-light px-2 py-2 dark:border-edge-dark">
        <ThemeToggle />
      </div>
    </aside>
  )
}
