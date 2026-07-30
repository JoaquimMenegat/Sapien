// POST /api/cancel-subscription
// Header: Authorization: Bearer <supabase access token>
// Cancela a renovação no Asaas. O acesso Premium segue até o fim do período já pago
// (a UI usa current_period_end); marca status='canceled' localmente. O webhook
// SUBSCRIPTION_DELETED chega em seguida e confirma o mesmo estado.
import { createClient } from '@supabase/supabase-js'
import { cancelSubscription, admin, json } from './_asaas'

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' })
  try {
    // 1) Autentica pelo token do Supabase.
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

    // 2) Busca a assinatura do usuário.
    const db = admin()
    const { data: sub } = await db
      .from('subscriptions')
      .select('asaas_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle()

    // 3) Cancela no Asaas (se houver assinatura lá).
    if (sub?.asaas_subscription_id) {
      await cancelSubscription(sub.asaas_subscription_id as string)
    }

    // 4) Marca como cancelada (o acesso continua até current_period_end).
    await db
      .from('subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    return json(res, 200, { ok: true })
  } catch (e: any) {
    return json(res, 500, { error: 'Falha ao cancelar a assinatura.', detail: String(e?.message || e) })
  }
}
