import { useState, type ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { useApp } from '../store/app'
import { ManageSubscriptionModal } from './ManageSubscriptionModal'

// Envolve uma seção Premium: quando o usuário não tem acesso, mostra o conteúdo
// borrado atrás de um cartão com a chamada para assinar. Durante o trial (ou com
// assinatura ativa) o conteúdo passa direto. Para testar o bloqueio sem sair do
// Premium, use ?lockpremium=1 na URL (liga o previewLock no store).
export function PremiumGate({
  title,
  children
}: {
  title: string
  children: ReactNode
}): JSX.Element {
  const isPremium = useApp((s) => s.isPremium)
  const previewLock = useApp((s) => s.previewLock)
  const [open, setOpen] = useState(false)

  const locked = !isPremium || previewLock
  if (!locked) return <>{children}</>

  return (
    <div className="relative">
      {/* Prévia borrada do conteúdo real por trás do paywall. */}
      <div aria-hidden className="pointer-events-none max-h-[70vh] select-none overflow-hidden opacity-70 blur-[7px]">
        {children}
      </div>

      {/* Scrim + cartão de assinatura. */}
      <div className="absolute inset-0 flex items-start justify-center bg-gradient-to-b from-canvas/40 via-canvas/60 to-canvas/90 px-4 pt-16">
        <div className="card w-full max-w-md p-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Lock size={22} />
          </div>
          <h3 className="font-serif text-xl font-bold text-ink">{title} é um recurso Premium</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            Desbloqueie <b>Gêneros</b>, <b>Autores</b>, <b>Metas</b>, <b>Estatísticas</b> e{' '}
            <b>Exportar dados</b> assinando o Sapien Premium. Sua biblioteca, sessões e notas
            continuam sempre livres.
          </p>
          <button onClick={() => setOpen(true)} className="btn-primary mt-5 w-full">
            Assinar Premium
          </button>
          <p className="mt-2 text-xs text-ink-faint">A partir de R$ 12,49/mês no plano anual.</p>
        </div>
      </div>

      <ManageSubscriptionModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
