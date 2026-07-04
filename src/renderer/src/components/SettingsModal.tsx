import { Check, Palette } from 'lucide-react'
import { useApp, ACCENTS, APPEARANCES, type AnimStyle } from '../store/app'
import { Modal } from './ui/Modal'

const ANIMS: { id: AnimStyle; label: string; desc: string }[] = [
  { id: 'sutil', label: 'Sutil', desc: 'Transições suaves (padrão)' },
  { id: 'rico', label: 'Rico', desc: 'Cartões ganham leve elevação ao passar o mouse' },
  { id: 'nenhuma', label: 'Nenhuma', desc: 'Interface sem animações' }
]

export function SettingsModal({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): JSX.Element {
  const { appearance, setAppearance, accent, setAccent, animation, setAnimation } = useApp()

  return (
    <Modal open={open} onClose={onClose} title="Personalização">
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink">Aparência</h3>
          <div className="flex flex-wrap gap-1.5">
            {APPEARANCES.map((a) => (
              <button
                key={a.id}
                onClick={() => setAppearance(a.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  appearance === a.id
                    ? 'border-transparent bg-accent text-white'
                    : 'border-edge text-ink-soft hover:bg-ink/[0.05]'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink">Cor de acento</h3>
          <div className="flex flex-wrap gap-2.5">
            {ACCENTS.map((a) => {
              const selected = accent === a.id
              if (a.id === 'tema') {
                return (
                  <button
                    key={a.id}
                    onClick={() => setAccent('tema')}
                    title="Padrão do tema"
                    aria-label="Padrão do tema"
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-ink-faint transition ${
                      selected ? 'border-ink' : 'border-edge hover:border-ink-faint'
                    }`}
                  >
                    <Palette size={16} />
                  </button>
                )
              }
              return (
                <button
                  key={a.id}
                  onClick={() => setAccent(a.id)}
                  title={a.label}
                  aria-label={a.label}
                  style={{ backgroundColor: a.base }}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                    selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-canvas' : ''
                  }`}
                >
                  {selected && <Check size={16} className="text-white" />}
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink">Animações</h3>
          <div className="space-y-2">
            {ANIMS.map((an) => (
              <button
                key={an.id}
                onClick={() => setAnimation(an.id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  animation === an.id ? 'border-accent bg-accent/[0.06]' : 'border-edge hover:bg-ink/[0.03]'
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    animation === an.id ? 'border-accent bg-accent' : 'border-ink-faint'
                  }`}
                >
                  {animation === an.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink">{an.label}</span>
                  <span className="block text-xs text-ink-faint">{an.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  )
}
