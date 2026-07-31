import { useEffect, useState } from 'react'
import { Crown, ExternalLink } from 'lucide-react'
import { useApp } from '../store/app'
import type { BillingDetails, PaidPlan } from '../../../shared/types'
import { Modal } from './ui/Modal'

type Msg = { ok: boolean; text: string } | null

const PLAN_INFO: Record<PaidPlan, { label: string; price: string; per: string; note?: string; value: number }> = {
  monthly: { label: 'Mensal', price: 'R$ 19,90', per: '/mês', value: 19.9 },
  yearly: {
    label: 'Anual',
    price: 'R$ 149,90',
    per: '/ano',
    note: 'Equivale a R$ 12,49/mês · economize ~37%',
    value: 149.9
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '—'
  }
}
function fmtBRL(v: number | null): string {
  if (v == null) return '—'
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}
function humanRemaining(iso: string | null): string {
  if (!iso) return '—'
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'expirado'
  const days = Math.ceil(ms / 86_400_000)
  if (days >= 30) return `${Math.round(days / 30)} mês(es)`
  return `${days} dia(s)`
}

const PLAN_LABEL: Record<string, string> = { free: 'Grátis', monthly: 'Mensal', yearly: 'Anual' }
const STATUS_LABEL: Record<string, string> = {
  none: 'Grátis',
  trialing: 'Teste grátis',
  active: 'Ativo',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelada'
}
const STATUS_COLOR: Record<string, string> = {
  none: 'text-ink-soft',
  trialing: 'text-amber-500',
  active: 'text-emerald-500',
  past_due: 'text-red-500',
  canceled: 'text-ink-soft'
}
function billingTypeLabel(t: string | null): string {
  switch (t) {
    case 'PIX':
      return 'Pix'
    case 'BOLETO':
      return 'Boleto'
    case 'CREDIT_CARD':
      return 'Cartão de Crédito'
    default:
      return '—'
  }
}
function paymentStatusLabel(s: string): { text: string; color: string } {
  switch (s) {
    case 'CONFIRMED':
    case 'RECEIVED':
    case 'RECEIVED_IN_CASH':
      return { text: 'Pago', color: 'text-emerald-500' }
    case 'PENDING':
    case 'AWAITING_RISK_ANALYSIS':
      return { text: 'Aguardando', color: 'text-amber-500' }
    case 'OVERDUE':
      return { text: 'Vencido', color: 'text-red-500' }
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
      return { text: 'Estornado', color: 'text-ink-soft' }
    default:
      return { text: s || '—', color: 'text-ink-soft' }
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <span className="block text-xs text-ink-faint">{label}</span>
      <span className="text-sm font-medium text-ink">{children}</span>
    </div>
  )
}

export function ManageSubscriptionModal({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): JSX.Element {
  const subscribe = useApp((s) => s.subscribe)
  const cancelSubscription = useApp((s) => s.cancelSubscription)
  const refreshBilling = useApp((s) => s.refreshBilling)

  const [loading, setLoading] = useState(true)
  const [d, setD] = useState<BillingDetails | null>(null)
  const [plan, setPlan] = useState<PaidPlan>('yearly')
  const [cpf, setCpf] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  async function load(): Promise<void> {
    setLoading(true)
    try {
      setD(await window.readdeck.billing.details())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (open) {
      setMsg(null)
      setConfirmCancel(false)
      void load()
    }
  }, [open])

  const status = d?.status ?? 'none'
  const isActive = status === 'active'
  const isTrial = status === 'trialing'
  const isCanceled = status === 'canceled'
  const planKey = d?.plan ?? 'free'
  const endRef = d?.currentPeriodEnd ?? d?.trialEndsAt ?? d?.nextDueDate ?? null
  const shownValue = d?.value ?? (planKey === 'monthly' ? 19.9 : planKey === 'yearly' ? 149.9 : null)

  async function handleSubscribe(): Promise<void> {
    const digits = cpf.replace(/\D/g, '')
    if (digits.length !== 11 && digits.length !== 14) {
      setMsg({ ok: false, text: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.' })
      return
    }
    setBusy(true)
    setMsg(null)
    const res = await subscribe(plan, digits)
    setBusy(false)
    if (!res.ok) {
      setMsg({ ok: false, text: res.error ?? 'Não foi possível iniciar a assinatura.' })
      return
    }
    if (res.invoiceUrl) {
      const win = window.open(res.invoiceUrl, '_blank', 'noopener,noreferrer')
      if (!win) window.location.href = res.invoiceUrl
      setMsg({
        ok: true,
        text: 'Abrimos a página de pagamento numa nova aba. Assim que o pagamento for confirmado, seu Premium é liberado automaticamente.'
      })
    } else {
      setMsg({
        ok: true,
        text: 'Assinatura criada! A primeira cobrança acontece ao fim do teste — o link chega no seu e-mail.'
      })
    }
    void refreshBilling()
    void load()
  }

  async function handleCancel(): Promise<void> {
    setBusy(true)
    setMsg(null)
    const res = await cancelSubscription()
    setBusy(false)
    setConfirmCancel(false)
    setMsg(
      res.ok
        ? { ok: true, text: 'Renovação cancelada. Seu acesso continua até o fim do período atual.' }
        : { ok: false, text: res.error ?? 'Não foi possível cancelar.' }
    )
    if (res.ok) void load()
  }

  return (
    <Modal open={open} onClose={onClose} title="Gerenciar assinatura" wide>
      {loading ? (
        <p className="py-8 text-center text-sm text-ink-faint">Carregando sua assinatura…</p>
      ) : (
        <div className="space-y-5">
          {/* Cartão de estado */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr]">
            <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-hover p-6 text-center">
              <span className="text-2xl font-bold text-white">{PLAN_LABEL[planKey] ?? 'Grátis'}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-edge p-4">
              <Field label="Situação">
                <span className={STATUS_COLOR[status]}>{STATUS_LABEL[status] ?? status}</span>
              </Field>
              <Field label="Próximo pagamento">{fmtDate(d?.nextDueDate ?? d?.currentPeriodEnd ?? null)}</Field>
              <Field label="Vencimento">{fmtDate(endRef)}</Field>
              <Field label="Valor">{fmtBRL(shownValue)}</Field>
              <Field label="Adesão">{fmtDate(d?.startDate ?? null)}</Field>
              <Field label="Forma de pagamento">{billingTypeLabel(d?.billingType ?? null)}</Field>
              {isTrial && <Field label="Teste termina em">{humanRemaining(d?.trialEndsAt ?? null)}</Field>}
              <Field label="Tempo restante">{humanRemaining(endRef)}</Field>
            </div>
          </div>

          {/* Ações */}
          {isActive ? (
            <div>
              {!confirmCancel ? (
                <button onClick={() => setConfirmCancel(true)} className="btn-ghost py-2 text-sm">
                  Cancelar renovação
                </button>
              ) : (
                <div className="rounded-xl border border-edge p-3">
                  <p className="text-xs text-ink-soft">
                    Você continua com acesso até <b>{fmtDate(endRef)}</b> e não será cobrado de novo. Confirmar?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setConfirmCancel(false)} disabled={busy} className="btn-ghost py-1.5 text-sm">
                      Voltar
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={busy}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                    >
                      {busy ? 'Cancelando…' : 'Confirmar cancelamento'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-edge p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                <Crown size={15} className="text-amber-500" />
                {isTrial
                  ? 'Assine para não perder o Premium ao fim do teste'
                  : isCanceled
                    ? 'Reative sua assinatura'
                    : 'Torne-se Premium'}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PLAN_INFO) as PaidPlan[]).map((id) => {
                  const info = PLAN_INFO[id]
                  const selected = plan === id
                  return (
                    <button
                      key={id}
                      onClick={() => setPlan(id)}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        selected ? 'border-accent bg-accent/[0.06]' : 'border-edge hover:bg-ink/[0.03]'
                      }`}
                    >
                      <span className="block text-xs font-medium text-ink-soft">{info.label}</span>
                      <span className="mt-0.5 block text-base font-semibold text-ink">
                        {info.price}
                        <span className="text-xs font-normal text-ink-faint">{info.per}</span>
                      </span>
                      {info.note && <span className="mt-0.5 block text-[11px] text-emerald-500">{info.note}</span>}
                    </button>
                  )
                })}
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-ink-soft">CPF ou CNPJ</label>
                <input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  inputMode="numeric"
                  placeholder="Só números (ex.: 12345678900)"
                  className="field"
                />
                <p className="mt-1 text-[11px] text-ink-faint">
                  Exigido pelo Asaas para emitir a cobrança (Pix/boleto/cartão). Não fica salvo no Sapien.
                </p>
              </div>
              <button onClick={handleSubscribe} disabled={busy} className="btn-primary mt-3 w-full">
                {busy ? 'Abrindo pagamento…' : isCanceled ? 'Reassinar' : 'Assinar Premium'}
              </button>
              <p className="mt-1.5 text-center text-[11px] text-ink-faint">
                Pagamento seguro via Asaas (Pix, boleto ou cartão). Cancele quando quiser.
              </p>
            </div>
          )}

          {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-500' : 'text-red-500'}`}>{msg.text}</p>}

          {/* Histórico de compras */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Histórico de compras
            </h3>
            {d && d.payments.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-edge">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-edge text-xs text-ink-faint">
                    <tr>
                      <th className="px-3 py-2 font-medium">Data</th>
                      <th className="px-3 py-2 font-medium">Provedor</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Forma</th>
                      <th className="px-3 py-2 font-medium">Valor</th>
                      <th className="px-3 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.payments.map((p) => {
                      const st = paymentStatusLabel(p.status)
                      return (
                        <tr key={p.id} className="border-b border-edge/60 last:border-0">
                          <td className="px-3 py-2 text-ink">{fmtDate(p.paidDate ?? p.dueDate)}</td>
                          <td className="px-3 py-2 text-ink-soft">Asaas</td>
                          <td className={`px-3 py-2 font-medium ${st.color}`}>{st.text}</td>
                          <td className="px-3 py-2 text-ink-soft">{billingTypeLabel(p.billingType)}</td>
                          <td className="px-3 py-2 text-ink">{fmtBRL(p.value)}</td>
                          <td className="px-3 py-2">
                            {p.invoiceUrl && (
                              <a
                                href={p.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                              >
                                Ver <ExternalLink size={12} />
                              </a>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-edge p-4 text-center text-xs text-ink-faint">
                Nenhuma cobrança ainda. As compras aparecerão aqui após a primeira assinatura.
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
