import { useEffect, useState, type FormEvent } from 'react'
import { Mail, Lock, User, ArrowRight, LogIn, KeyRound, ExternalLink } from 'lucide-react'
import { useApp } from '../store/app'
import { cleanErrorMessage } from '../lib/errors'
import { LogoMark } from './Logo'

function RememberToggle({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-ink-soft">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-edge accent-accent"
      />
      Manter conectado
    </label>
  )
}

function GoogleConfigPanel({ onDone }: { onDone: () => void }): JSX.Element {
  const [clientId, setClientId] = useState('')
  const [secret, setSecret] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!clientId.trim() || !secret.trim()) return
    setSaving(true)
    await window.readdeck.account.setGoogleConfig(clientId.trim(), secret.trim())
    setSaving(false)
    onDone()
  }

  return (
    <form onSubmit={save} className="mt-3 space-y-2.5 rounded-xl border border-edge bg-surface p-3.5 text-left">
      <p className="text-xs text-ink-soft">
        Cole as credenciais de um cliente OAuth do tipo <b>App de desktop</b> criado em{' '}
        <a href="https://console.cloud.google.com/apis/credentials" className="text-accent hover:underline">
          console.cloud.google.com <ExternalLink size={10} className="inline" />
        </a>
        .
      </p>
      <input
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        placeholder="Client ID (…apps.googleusercontent.com)"
        className="field font-mono text-xs"
      />
      <input
        type="password"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder="Client secret"
        className="field font-mono text-xs"
      />
      <button type="submit" disabled={saving} className="btn-primary w-full py-2 text-sm">
        {saving ? 'Salvando…' : 'Salvar credenciais'}
      </button>
    </form>
  )
}

export function LoginScreen(): JSX.Element {
  const account = useApp((s) => s.auth?.account ?? null)
  const hasAccount = useApp((s) => s.auth?.hasAccount ?? false)
  const signup = useApp((s) => s.signup)
  const login = useApp((s) => s.login)
  const googleSignIn = useApp((s) => s.googleSignIn)

  // Na web (SaaS), qualquer visitante pode entrar OU criar conta → toggle.
  // No desktop, é uma conta por instalação (signup só se não existe conta).
  const IS_WEB = !!import.meta.env.VITE_SUPABASE_URL
  const googleOnly = account?.provider === 'google'

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [webMode, setWebMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isSignup = IS_WEB ? webMode === 'signup' : !hasAccount

  const [googleReady, setGoogleReady] = useState(false)
  const [showCfg, setShowCfg] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

  useEffect(() => {
    void window.readdeck.account.googleConfig().then((c) => setGoogleReady(c.configured))
  }, [])

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = isSignup
      ? await signup(email, name, password, remember)
      : await login(email, password, remember)
    if (!res.ok) {
      setError(res.error ?? 'Não foi possível continuar.')
      setBusy(false)
    }
  }

  async function handleGoogle(): Promise<void> {
    setError(null)
    if (!googleReady) {
      setShowCfg(true)
      return
    }
    setGoogleBusy(true)
    const res = await googleSignIn(remember)
    if (!res.ok) {
      setError(cleanErrorMessage(res.error ?? 'Falha no login com Google.'))
      setGoogleBusy(false)
    }
    // Sucesso: refreshAuth troca a tela.
  }

  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm text-center">
        <LogoMark size={56} className="mx-auto mb-4" />
        <h1 className="text-3xl font-extrabold tracking-tight text-ink" style={{ letterSpacing: '-0.02em' }}>
          Sapien
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          {googleOnly
            ? `Bem-vindo de volta, ${account?.name?.split(' ')[0] || ''}.`
            : isSignup
              ? 'Crie sua conta para começar sua estante.'
              : 'Bem-vindo de volta à sua estante.'}
        </p>

        {!googleOnly && (
          <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6 text-left">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-soft">E-mail</span>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" className="field pl-9" />
              </div>
            </label>

            {isSignup && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-soft">Nome</span>
                <div className="relative">
                  <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Como quer ser chamado(a)" className="field pl-9" />
                </div>
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-soft">Senha</span>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isSignup ? 'Mínimo 6 caracteres' : 'Sua senha'} className="field pl-9" />
              </div>
            </label>

            <RememberToggle checked={remember} onChange={setRemember} />

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Aguarde...' : isSignup ? 'Criar conta' : 'Entrar'}
              {!busy && <ArrowRight size={16} />}
            </button>
          </form>
        )}

        {/* Entrar com Google — só no desktop (na web, Google é via Supabase, fase futura). */}
        {!IS_WEB && (
        <div className={googleOnly ? 'card mt-6 p-6' : 'mt-3'}>
          {!googleOnly && (
            <div className="mb-3 flex items-center gap-3 text-xs text-ink-faint">
              <span className="h-px flex-1 bg-edge" /> ou <span className="h-px flex-1 bg-edge" />
            </div>
          )}
          {googleOnly && account?.picture && (
            <img src={account.picture} alt="" className="mx-auto mb-3 h-14 w-14 rounded-full border border-edge object-cover" />
          )}
          {googleOnly && (
            <div className="mb-3 flex justify-center">
              <RememberToggle checked={remember} onChange={setRemember} />
            </div>
          )}
          <button onClick={handleGoogle} disabled={googleBusy} className="btn-ghost w-full">
            {googleBusy ? (
              'Abrindo o navegador…'
            ) : (
              <>
                {googleReady ? <LogIn size={16} /> : <KeyRound size={16} />}
                {googleReady ? 'Entrar com Google' : 'Configurar login com Google'}
              </>
            )}
          </button>
          {showCfg && <GoogleConfigPanel onDone={() => { setGoogleReady(true); setShowCfg(false) }} />}
          {googleBusy && (
            <p className="mt-2 text-xs text-ink-faint">Conclua o login na aba que abriu e volte aqui.</p>
          )}
        </div>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        {IS_WEB ? (
          <p className="mt-5 text-sm text-ink-soft">
            {isSignup ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
            <button
              type="button"
              onClick={() => {
                setWebMode(isSignup ? 'login' : 'signup')
                setError(null)
              }}
              className="font-semibold text-accent hover:underline"
            >
              {isSignup ? 'Entrar' : 'Criar conta'}
            </button>
          </p>
        ) : (
          <p className="mt-5 text-xs leading-relaxed text-ink-faint">
            Seus dados ficam neste computador. O login com Google é opcional e usa suas próprias
            credenciais.
          </p>
        )}
      </div>
    </div>
  )
}
