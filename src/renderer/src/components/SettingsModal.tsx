import { useEffect, useState } from 'react'
import { Check, Palette, Camera, Trash2, Timer, ShieldAlert } from 'lucide-react'
import { useApp, ACCENTS, APPEARANCES, type AnimStyle } from '../store/app'
import { Modal } from './ui/Modal'

// Tempo mínimo (min) para uma sessão contar na sequência e nas estatísticas de hoje.
function SessionSection(): JSX.Element {
  const [min, setMin] = useState('')

  useEffect(() => {
    void window.readdeck.getSetting('reading.minSessionMin').then((v) => setMin(v ?? '0'))
  }, [])

  function save(v: string): void {
    setMin(v)
    const n = Math.max(0, parseInt(v, 10) || 0)
    void window.readdeck.setSetting('reading.minSessionMin', String(n))
  }

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        <Timer size={15} className="text-ink-faint" /> Sessão de leitura
      </h3>
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        Tempo mínimo para contar
        <input
          type="number"
          min={0}
          value={min}
          onChange={(e) => save(e.target.value)}
          className="field w-20 py-1.5 text-center"
        />
        min
      </label>
      <p className="mt-1.5 text-xs text-ink-faint">
        Sessões mais curtas que isso não contam para a <b>sequência</b> nem para as estatísticas do
        dia. 0 = conta todas.
      </p>
    </section>
  )
}

function ProfileSection(): JSX.Element {
  const account = useApp((s) => s.auth?.account ?? null)
  const updateProfile = useApp((s) => s.updateProfile)
  const [name, setName] = useState(account?.name ?? '')
  const [busy, setBusy] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const initials = (account?.name || account?.email || '?').slice(0, 2).toUpperCase()

  async function chooseAvatar(): Promise<void> {
    setAvatarError(null)
    try {
      const url = await window.readdeck.account.pickAvatar()
      if (url) await updateProfile(account?.name ?? name, url)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Não foi possível enviar a foto.')
    }
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
      {avatarError && <p className="mt-2 text-xs text-red-500">{avatarError}</p>}
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

type Msg = { ok: boolean; text: string } | null

// Gerenciar a própria conta: trocar e-mail, trocar senha e excluir a conta + dados.
function AccountSection(): JSX.Element {
  const account = useApp((s) => s.auth?.account ?? null)
  const changePassword = useApp((s) => s.changePassword)
  const changeEmail = useApp((s) => s.changeEmail)
  const deleteAccount = useApp((s) => s.deleteAccount)

  const IS_WEB = !!import.meta.env.VITE_SUPABASE_URL
  const isGoogle = account?.provider === 'google'

  const [email, setEmail] = useState(account?.email ?? '')
  const [emailMsg, setEmailMsg] = useState<Msg>(null)
  const [emailBusy, setEmailBusy] = useState(false)

  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwMsg, setPwMsg] = useState<Msg>(null)
  const [pwBusy, setPwBusy] = useState(false)

  const [confirmDel, setConfirmDel] = useState(false)
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState<string | null>(null)

  async function saveEmail(): Promise<void> {
    const next = email.trim()
    if (!next || next === account?.email) return
    setEmailBusy(true)
    setEmailMsg(null)
    const res = await changeEmail(next)
    setEmailBusy(false)
    setEmailMsg(
      res.ok
        ? {
            ok: true,
            text: IS_WEB
              ? 'Enviamos um link de confirmação. Confirme no e-mail (novo e atual) para concluir a troca.'
              : 'E-mail atualizado.'
          }
        : { ok: false, text: res.error ?? 'Não foi possível trocar o e-mail.' }
    )
  }

  async function savePassword(): Promise<void> {
    if (!newPw) return
    setPwBusy(true)
    setPwMsg(null)
    const res = await changePassword(curPw, newPw)
    setPwBusy(false)
    if (res.ok) {
      setPwMsg({ ok: true, text: 'Senha alterada com sucesso.' })
      setCurPw('')
      setNewPw('')
    } else {
      setPwMsg({ ok: false, text: res.error ?? 'Não foi possível trocar a senha.' })
    }
  }

  async function confirmDelete(): Promise<void> {
    setDelBusy(true)
    setDelErr(null)
    const res = await deleteAccount()
    // Sucesso: refreshAuth desloga e o App volta para a tela de login (este modal some junto).
    if (!res.ok) {
      setDelBusy(false)
      setDelErr(res.error ?? 'Não foi possível excluir a conta.')
    }
  }

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        <ShieldAlert size={15} className="text-ink-faint" /> Conta e segurança
      </h3>

      <div className="mb-4">
        <span className="mb-1 block text-xs font-medium text-ink-soft">E-mail de acesso</span>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
          <button
            onClick={saveEmail}
            disabled={emailBusy || !email.trim() || email.trim() === account?.email}
            className="btn-ghost shrink-0"
          >
            {emailBusy ? '...' : 'Trocar'}
          </button>
        </div>
        {emailMsg && (
          <p className={`mt-1.5 text-xs ${emailMsg.ok ? 'text-emerald-500' : 'text-red-500'}`}>
            {emailMsg.text}
          </p>
        )}
      </div>

      {isGoogle ? (
        <p className="mb-4 text-xs text-ink-faint">
          Esta conta entra com o Google — a senha é gerenciada por lá.
        </p>
      ) : (
        <div className="mb-4">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Trocar senha</span>
          <div className="space-y-2">
            <input
              type="password"
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              placeholder="Senha atual"
              className="field"
            />
            <div className="flex gap-2">
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Nova senha (mín. 6)"
                className="field"
              />
              <button onClick={savePassword} disabled={pwBusy || !newPw} className="btn-ghost shrink-0">
                {pwBusy ? '...' : 'Salvar'}
              </button>
            </div>
          </div>
          {pwMsg && (
            <p className={`mt-1.5 text-xs ${pwMsg.ok ? 'text-emerald-500' : 'text-red-500'}`}>
              {pwMsg.text}
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-red-500/30 bg-red-500/[0.04] p-3">
        <p className="text-sm font-medium text-ink">Excluir minha conta</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          Remove sua conta e <b>todos os dados</b> (livros, sessões, metas, notas). Não dá para
          desfazer.
        </p>
        {!confirmDel ? (
          <button
            onClick={() => {
              setConfirmDel(true)
              setDelErr(null)
            }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
          >
            <Trash2 size={14} /> Excluir conta
          </button>
        ) : (
          <div className="mt-2">
            <p className="text-xs font-medium text-ink">Tem certeza? Isso apaga tudo.</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setConfirmDel(false)}
                disabled={delBusy}
                className="btn-ghost py-1.5 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={delBusy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {delBusy ? 'Excluindo…' : 'Sim, excluir tudo'}
              </button>
            </div>
          </div>
        )}
        {delErr && <p className="mt-1.5 text-xs text-red-500">{delErr}</p>}
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

        <AccountSection />

        <SessionSection />

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
