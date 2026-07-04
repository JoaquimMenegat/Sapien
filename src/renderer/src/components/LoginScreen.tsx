import { useState, type FormEvent } from 'react'
import { Library, Mail, Lock, User, ArrowRight } from 'lucide-react'
import { useApp } from '../store/app'
import { AppearancePicker } from './AppearancePicker'

export function LoginScreen(): JSX.Element {
  const hasAccount = useApp((s) => s.auth?.hasAccount ?? false)
  const signup = useApp((s) => s.signup)
  const login = useApp((s) => s.login)

  const isSignup = !hasAccount
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = isSignup
      ? await signup(email, name, password)
      : await login(email, password)
    if (!res.ok) {
      setError(res.error ?? 'Não foi possível continuar.')
      setBusy(false)
    }
    // Em caso de sucesso, o refreshAuth troca a tela; não precisa resetar busy.
  }

  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-canvas px-6">
      <div className="absolute right-6 top-6 w-44">
        <AppearancePicker />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white shadow-lg">
            <Library size={24} />
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Sapien</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            {isSignup
              ? 'Crie sua conta para começar sua estante.'
              : 'Bem-vindo de volta à sua estante.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">E-mail</span>
            <div className="relative">
              <Mail
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="field pl-9"
              />
            </div>
          </label>

          {isSignup && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-soft">Nome</span>
              <div className="relative">
                <User
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como quer ser chamado(a)"
                  className="field pl-9"
                />
              </div>
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">Senha</span>
            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? 'Mínimo 6 caracteres' : 'Sua senha'}
                className="field pl-9"
              />
            </div>
          </label>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Aguarde...' : isSignup ? 'Criar conta' : 'Entrar'}
            {!busy && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-ink-faint">
          Sua conta fica só neste computador — nada é enviado para a nuvem.
          <br />A senha é guardada com hash seguro (scrypt).
        </p>
      </div>
    </div>
  )
}
