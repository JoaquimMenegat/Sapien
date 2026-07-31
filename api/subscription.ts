// GET /api/subscription
// Header: Authorization: Bearer <supabase access token>
// Devolve a visão completa da assinatura do usuário logado: dados locais
// (status/plano/trial/período) + enriquecimento do Asaas (valor, forma de
// pagamento, próximo vencimento, adesão e histórico de cobranças).
import { createClient } from '@supabase/supabase-js'
import { admin, json, asaas } from './_asaas'

function computePremium(status: string, trialEndsAt: string | null, periodEnd: string | null): boolean {
  const now = Date.now()
  const trialOk = trialEndsAt ? new Date(trialEndsAt).getTime() > now : false
  const periodOk = periodEnd ? new Date(periodEnd).getTime() > now : false
  return (
    status === 'active' ||
    (status === 'trialing' && trialOk) ||
    (status === 'canceled' && (periodOk || trialOk))
  )
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido.' })
  try {
    const token = String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '')
    if (!token) return json(res, 401, { error: 'Não autenticado.' })
    const anon = createClient(
      process.env.VITE_SUPABASE_URL as string,
      process.env.VITE_SUPABASE_ANON_KEY as string,
      { auth: { persistSession: false } }
    )
    const { data: u, error: uErr } = await anon.auth.getUser(token)
    if (uErr || !u?.user) return json(res, 401, { error: 'Sessão inválida.' })

    const db = admin()
    const { data: row } = await db
      .from('subscriptions')
      .select('status,plan,trial_ends_at,current_period_end,asaas_subscription_id')
      .eq('user_id', u.user.id)
      .maybeSingle()

    const status = (row?.status as string) || 'none'
    const trialEndsAt = (row?.trial_ends_at as string) ?? null
    const currentPeriodEnd = (row?.current_period_end as string) ?? null

    const details: any = {
      premium: computePremium(status, trialEndsAt, currentPeriodEnd),
      plan: (row?.plan as string) || 'free',
      status,
      trialEndsAt,
      currentPeriodEnd,
      startDate: null,
      nextDueDate: null,
      value: null,
      billingType: null,
      payments: []
    }

    // Enriquecimento pelo Asaas (se já houver assinatura lá).
    const subId = row?.asaas_subscription_id as string | undefined
    if (subId) {
      try {
        const sub = await asaas(`/subscriptions/${subId}`)
        details.value = typeof sub?.value === 'number' ? sub.value : details.value
        details.nextDueDate = sub?.nextDueDate ?? null
        details.startDate = (sub?.dateCreated as string)?.slice(0, 10) ?? null
        const subType = sub?.billingType as string | undefined

        const pays = await asaas(`/subscriptions/${subId}/payments`)
        const list = (pays?.data ?? []) as any[]
        details.payments = list.map((p) => ({
          id: String(p.id),
          dueDate: p.dueDate ?? null,
          paidDate: p.paymentDate ?? p.confirmedDate ?? null,
          value: typeof p.value === 'number' ? p.value : 0,
          status: String(p.status ?? ''),
          billingType: String(p.billingType ?? 'UNDEFINED'),
          invoiceUrl: p.invoiceUrl ?? null
        }))

        // Forma de pagamento: a da assinatura, ou a da cobrança mais recente.
        const latestType = list[0]?.billingType as string | undefined
        details.billingType =
          subType && subType !== 'UNDEFINED' ? subType : latestType && latestType !== 'UNDEFINED' ? latestType : null
      } catch {
        /* Asaas indisponível: devolve ao menos os dados locais. */
      }
    }

    return json(res, 200, details)
  } catch (e: any) {
    return json(res, 500, { error: 'Falha ao carregar a assinatura.', detail: String(e?.message || e) })
  }
}
