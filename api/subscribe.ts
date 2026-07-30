// POST /api/subscribe  { plan: 'monthly' | 'yearly' }
// Header: Authorization: Bearer <supabase access token>
// Cria (ou reaproveita) o cliente Asaas do usuário logado, cria a assinatura e
// devolve o link de pagamento. O status só vira 'active' quando o webhook confirmar.
import { createClient } from '@supabase/supabase-js'
import { ensureCustomer, createSubscription, admin, json, type PlanId } from './_asaas'

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' })
  try {
    // 1) Autentica pelo token do Supabase (prova quem é o usuário).
    const token = String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '')
    if (!token) return json(res, 401, { error: 'Não autenticado.' })
    const anon = createClient(
      process.env.VITE_SUPABASE_URL as string,
      process.env.VITE_SUPABASE_ANON_KEY as string,
      { auth: { persistSession: false } }
    )
    const { data: u, error: uErr } = await anon.auth.getUser(token)
    if (uErr || !u?.user) return json(res, 401, { error: 'Sessão inválida.' })
    const user = u.user

    // 2) Valida o plano e o CPF/CNPJ (o Asaas exige para gerar a cobrança).
    const plan = req.body?.plan as PlanId
    if (plan !== 'monthly' && plan !== 'yearly') return json(res, 400, { error: 'Plano inválido.' })
    const cpfCnpj = String(req.body?.cpfCnpj || '').replace(/\D/g, '')
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      return json(res, 400, { error: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.' })
    }

    // 3) Cliente Asaas (reaproveita se já existir) + assinatura.
    const db = admin()
    const { data: current } = await db
      .from('subscriptions')
      .select('asaas_customer_id, trial_ends_at')
      .eq('user_id', user.id)
      .maybeSingle()

    const customerId = await ensureCustomer({
      userId: user.id,
      name: (user.user_metadata?.name as string) || '',
      email: user.email || '',
      cpfCnpj,
      existingId: current?.asaas_customer_id ?? null
    })

    const { subscriptionId, invoiceUrl } = await createSubscription({
      customerId,
      userId: user.id,
      plan,
      trialEndsAt: (current?.trial_ends_at as string) ?? null
    })

    // 4) Guarda os ids (status vira 'active' só no webhook de pagamento confirmado).
    await db.from('subscriptions').upsert({
      user_id: user.id,
      plan,
      asaas_customer_id: customerId,
      asaas_subscription_id: subscriptionId,
      updated_at: new Date().toISOString()
    })

    return json(res, 200, { invoiceUrl })
  } catch (e: any) {
    return json(res, 500, { error: 'Falha ao criar a assinatura.', detail: String(e?.message || e) })
  }
}
