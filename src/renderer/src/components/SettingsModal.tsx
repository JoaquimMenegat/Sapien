import { useState } from 'react'
import { Check, Palette, Camera, Trash2 } from 'lucide-react'
import { useApp, ACCENTS, APPEARANCES, type AnimStyle } from '../store/app'
import { Modal } from './ui/Modal'

function ProfileSection(): JSX.Element {
  const account = useApp((s) => s.auth?.account ?? null)
  const updateProfile = useApp((s) => s.updateProfile)
  const [name, setName] = useState(account?.name ?? '')
  const [busy, setBusy] = useState(false)

  const initials = (account?.name || account?.email || '?').slice(0, 2).toUpperCase()

  async function chooseAvatar(): Promise<void> {
    const url = await window.readdeck.account.pickAvatar()
    if (url) await updateProfile(account?.name ?? name, url)
  }
  async function removeAvatar(): Promise<void> {
    await updateProfile(account?.name ?? name, null)
  }
  async function saveName(): Promise<void> {
    if (!name.trim()) return
    setBusy(true)
    await updateProfile(name.trim(), account?.picture ?? null)
    setBusy(false)
  }

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-ink">Perfil</h3>
      <div className="flex items-center gap-3">
        {account?.picture ? (
          <img src={account.picture} alt="" className="h-14 w-14 rounded-full border border-edge object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-base font-semibold text-accent">
            {initials}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={chooseAvatar} className="btn-ghost py-1.5 text-sm">
            <Camera size={14} /> Trocar foto
          </button>
          {account?.picture && (
            <button onClick={removeAvatar} className="btn-ghost py-1.5 text-sm">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="mt-3">
        <span className="mb-1 block text-xs font-medium text-ink-soft">Nome</span>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="field" />
          <button
            onClick={saveName}
            disabled={busy || name.trim() === (account?.name ?? '')}
            className="btn-primary shrink-0"
          >
            Salvar
          </button>
        </div>
      </div>
    </section>
  )
}

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
        <ProfileSection />

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
