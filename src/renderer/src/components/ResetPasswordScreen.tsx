import { useState, type FormEvent } from 'react'
import { Lock, ArrowRight } from 'lucide-react'
import { useApp } from '../store/app'
import { LogoMark } from './Logo'

// Tela mostrada quando o usuário chega pelo link de "redefinir senha" do e-mail.
// A sessão já vem autenticada pelo link, então aqui só definimos a senha nova.
export function ResetPasswordScreen(): JSX.Element {
  const completePasswordReset = useApp((s) => s.completePasswordReset)
  const endRecovery = useApp((s) => s.endRecovery)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setBusy(true)
    const res = await completePasswordReset(password)
    if (!res.ok) {
      setError(res.error ?? 'Não foi possível redefinir a senha.')
      setBusy(false)
    }
    // Sucesso: o store sai do modo recuperação e o App mostra a estante já logada.
  }

  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm text-center">
        <LogoMark size={56} className="mx-auto mb-4" />
        <h1
          className="text-3xl font-extrabold tracking-tight text-ink"
          style={{ letterSpacing: '-0.02em' }}
        >
          Criar nova senha
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Escolha uma senha nova para voltar à sua estante.
        </p>

        <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6 text-left">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">Nova senha</span>
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
                placeholder="Mínimo 6 caracteres"
                className="field pl-9"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">
              Confirme a nova senha
            </span>
            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                className="field pl-9"
              />
            </div>
          </label>

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Salvando...' : 'Salvar e entrar'}
            {!busy && <ArrowRight size={16} />}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <p className="mt-5 text-sm text-ink-soft">
          <button
            type="button"
            onClick={endRecovery}
            className="font-semibold text-accent hover:underline"
          >
            Cancelar
          </button>
        </p>
      </div>
    </div>
  )
}
