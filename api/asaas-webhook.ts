// POST /api/asaas-webhook  — chamado pelo Asaas quando um pagamento muda de estado.
// Mapeia de volta ao usuário pelo externalReference (= id do usuário no Supabase) e
// atualiza a tabela subscriptions. É a ÚNICA coisa que grava "Premium" (via service_role).
import { admin, json } from './_asaas'

function addPeriod(from: Date, plan: string): Date {
  const d = new Date(from)
  if (plan === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}

export default async function handler(req: any, res: any): Promise<void> {
  // Ping de conectividade (o Asaas pode testar a URL ao ativar o webhook): responde 200.
  if (req.method === 'GET' || req.method === 'HEAD') {
    return json(res, 200, { ok: true, service: 'asaas-webhook' })
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' })

  // Autenticidade: se configurado, o Asaas envia este token no header.
  const expected = process.env.ASAAS_WEBHOOK_TOKEN
  if (expected && req.headers['asaas-access-token'] !== expected) {
    return json(res, 401, { error: 'unauthorized' })
  }

  try {
    const body = req.body || {}
    const event = String(body.event || '')
    const payment = body.payment || {}
    const subscription = body.subscription || {}
    const userId = (payment.externalReference || subscription.externalReference) as string | undefined

    if (!userId) {
      // Sem referência ao usuário — nada a fazer, mas responde 200 pra não reenviar.
      return json(res, 200, { ignored: 'sem externalReference' })
    }
    const db = admin()

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const { data: sub } = await db
        .from('subscriptions')
        .select('plan')
        .eq('user_id', userId)
        .maybeSingle()
      const plan = (sub?.plan as string) || 'monthly'
      const base = payment.dueDate ? new Date(payment.dueDate) : new Date()
      await db.from('subscriptions').upsert({
        user_id: userId,
        status: 'active',
        current_period_end: addPeriod(base, plan).toISOString(),
        updated_at: new Date().toISOString()
      })
    } else if (event === 'PAYMENT_OVERDUE') {
      await db
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
    } else if (
      event === 'SUBSCRIPTION_DELETED' ||
      event === 'SUBSCRIPTION_INACTIVATED' ||
      event === 'PAYMENT_DELETED' ||
      event === 'PAYMENT_REFUNDED'
    ) {
      await db
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
    }
    // Outros eventos: ignorados de propósito.

    return json(res, 200, { ok: true })
  } catch (e: any) {
    // Responde 200 pra o Asaas não entrar em loop de reenvio; o erro fica no log.
    return json(res, 200, { ok: false, error: String(e?.message || e) })
  }
}
