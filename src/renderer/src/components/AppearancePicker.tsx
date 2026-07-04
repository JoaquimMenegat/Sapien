import { Sun, Moon, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp, type Appearance } from '../store/app'

const OPTIONS: { id: Appearance; label: string; icon: LucideIcon }[] = [
  { id: 'literary-light', label: 'Literary claro', icon: Sun },
  { id: 'literary-dark', label: 'Literary escuro', icon: Moon },
  { id: 'moderndark', label: 'Modern Dark', icon: Sparkles }
]

export function AppearancePicker(): JSX.Element {
  const appearance = useApp((s) => s.appearance)
  const setAppearance = useApp((s) => s.setAppearance)

  return (
    <div className="flex items-center gap-1 rounded-lg border border-edge bg-surface p-1">
      {OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setAppearance(id)}
          title={label}
          aria-label={label}
          className={`flex flex-1 items-center justify-center rounded-md py-1.5 transition-colors ${
            appearance === id
              ? 'bg-accent text-white'
              : 'text-ink-faint hover:bg-ink/[0.06] hover:text-ink-soft'
          }`}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  )
}
