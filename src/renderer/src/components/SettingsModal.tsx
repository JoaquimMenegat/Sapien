import { useEffect, useState } from 'react'
import { Check, Palette, Camera, Trash2, Timer, ShieldAlert, Crown, Download } from 'lucide-react'
import { useApp, ACCENTS, APPEARANCES, type AnimStyle } from '../store/app'
import { exportJSON, exportBooksCSV } from '../lib/exportData'
import { Modal } from './ui/Modal'
import { ManageSubscriptionModal } from './ManageSubscriptionModal'

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

// --- Assinatura Premium (só na web; no desktop o usuário é sempre Premium) ---
// Resumo compacto + botão "Gerenciar assinatura" (o detalhe/planos/CPF vivem no
// ManageSubscriptionModal).

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return ''
  }
}
function daysUntil(iso: string | null): number {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}

function SubscriptionSection(): JSX.Element | null {
  const IS_WEB = !!import.meta.env.VITE_SUPABASE_URL
  const billing = useApp((s) => s.billing)
  const refreshBilling = useApp((s) => s.refreshBilling)
  const [manageOpen, setManageOpen] = useState(false)

  useEffect(() => {
    if (IS_WEB) void refreshBilling()
  }, [IS_WEB, refreshBilling])

  if (!IS_WEB) return null

  const status = billing?.status ?? 'none'
  const untilDate = billing?.currentPeriodEnd ?? billing?.trialEndsAt ?? null

  const banner: { title: string; sub: string } =
    status === 'active'
      ? {
          title: 'Premium ativo',
          sub: `Plano ${billing?.plan === 'yearly' ? 'anual' : 'mensal'}${
            billing?.currentPeriodEnd ? ` · renova em ${fmtDate(billing.currentPeriodEnd)}` : ''
          }`
        }
      : status === 'trialing'
        ? {
            title: `Teste grátis · ${daysUntil(billing?.trialEndsAt ?? null)} dia(s) restante(s)`,
            sub: `Acesso a tudo até ${fmtDate(billing?.trialEndsAt ?? null)}.`
          }
        : status === 'canceled'
          ? {
              title: 'Assinatura cancelada',
              sub: untilDate ? `Acesso Premium até ${fmtDate(untilDate)}.` : 'A renovação foi cancelada.'
            }
          : status === 'past_due'
            ? { title: 'Pagamento pendente', sub: 'Regularize para manter o Premium.' }
            : { title: 'Plano Grátis', sub: 'Assine para desbloquear os recursos Premium.' }

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        <Crown size={15} className="text-amber-500" /> Assinatura
      </h3>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/[0.05] p-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{banner.title}</p>
          <p className="mt-0.5 truncate text-xs text-ink-soft">{banner.sub}</p>
        </div>
        <button onClick={() => setManageOpen(true)} className="btn-primary shrink-0 py-1.5 text-sm">
          Gerenciar
        </button>
      </div>

      <ManageSubscriptionModal open={manageOpen} onClose={() => setManageOpen(false)} />
    </section>
  )
}

// --- Exportar dados (recurso Premium) ---

function ExportSection(): JSX.Element {
  const isPremium = useApp((s) => s.isPremium)
  const previewLock = useApp((s) => s.previewLock)
  const [busy, setBusy] = useState<'json' | 'csv' | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const locked = !isPremium || previewLock

  async function run(kind: 'json' | 'csv', fn: () => Promise<void>): Promise<void> {
    setBusy(kind)
    setErr(null)
    try {
      await fn()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível exportar.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        <Download size={15} className="text-ink-faint" /> Exportar dados
      </h3>

      {locked ? (
        <div className="rounded-xl border border-accent/30 bg-accent/[0.05] p-3">
          <p className="text-sm font-medium text-ink">Exportar seus dados é um recurso Premium.</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            Baixe um backup completo (JSON) ou o acervo em planilha (CSV) assinando o Premium.
          </p>
          <button onClick={() => setManageOpen(true)} className="btn-primary mt-2 py-1.5 text-sm">
            Assinar Premium
          </button>
          <ManageSubscriptionModal open={manageOpen} onClose={() => setManageOpen(false)} />
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-ink-soft">
            Leve seus dados com você — um backup completo ou o acervo como planilha.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => run('json', exportJSON)}
              disabled={!!busy}
              className="btn-ghost py-1.5 text-sm"
            >
              {busy === 'json' ? 'Exportando…' : 'Backup completo (JSON)'}
            </button>
            <button
              onClick={() => run('csv', exportBooksCSV)}
              disabled={!!busy}
              className="btn-ghost py-1.5 text-sm"
            >
              {busy === 'csv' ? 'Exportando…' : 'Acervo (CSV)'}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-ink-faint">
            O JSON inclui livros, sessões, metas e notas. O CSV traz o acervo (abre no Excel/Sheets).
          </p>
          {err && <p className="mt-1.5 text-xs text-red-500">{err}</p>}
        </>
      )}
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

        <SubscriptionSection />

        <AccountSection />

        <ExportSection />

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
