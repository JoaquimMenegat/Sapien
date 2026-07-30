// Núcleo PORTÁVEL da integração de assinatura (Asaas + Supabase).
// Se um dia migrar pro Supabase Edge Functions, é isto que "viaja" — os handlers
// (subscribe/asaas-webhook) são só invólucros finos por cima daqui.
//
// Variáveis de ambiente (no servidor da Vercel, NUNCA com prefixo VITE_):
//   ASAAS_API_KEY            chave da API do Asaas (sandbox agora)
//   ASAAS_BASE_URL           ex.: https://api-sandbox.asaas.com/v3  (default abaixo)
//   ASAAS_WEBHOOK_TOKEN      (opcional) token que o Asaas envia no header do webhook
//   SUPABASE_SERVICE_ROLE_KEY   p/ gravar na tabela subscriptions (bypass RLS)
//   (reaproveita VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, que já existem)

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const ASAAS_BASE = process.env.ASAAS_BASE_URL || 'https://api-sandbox.asaas.com/v3'
const ASAAS_KEY = process.env.ASAAS_API_KEY || ''

export const PLANS = {
  monthly: { cycle: 'MONTHLY', value: 19.9 },
  yearly: { cycle: 'YEARLY', value: 149.9 }
} as const
export type PlanId = keyof typeof PLANS

/** Cliente Supabase com service_role — usado só no servidor, escreve ignorando RLS. */
export function admin(): SupabaseClient {
  return createClient(
    process.env.VITE_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

/** Resposta JSON simples (sem depender de helpers específicos da Vercel). */
export function json(res: any, code: number, obj: unknown): void {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(obj))
}

async function asaas(path: string, init?: { method?: string; body?: string }): Promise<any> {
  const r = await fetch(ASAAS_BASE + path, {
    method: init?.method || 'GET',
    headers: { 'Content-Type': 'application/json', access_token: ASAAS_KEY },
    body: init?.body
  })
  const text = await r.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* resposta não-JSON */
  }
  if (!r.ok) throw new Error(`Asaas ${path} -> HTTP ${r.status}: ${text.slice(0, 300)}`)
  return data
}

/** Cria (ou reaproveita) o cliente Asaas do usuário e devolve o id. */
export async function ensureCustomer(o: {
  userId: string
  name: string
  email: string
  existingId?: string | null
}): Promise<string> {
  if (o.existingId) return o.existingId
  const c = await asaas('/customers', {
    method: 'POST',
    body: JSON.stringify({ name: o.name || o.email, email: o.email, externalReference: o.userId })
  })
  return c.id as string
}

/** Cria a assinatura recorrente e devolve o id + link de pagamento (Pix/boleto/cartão). */
export async function createSubscription(o: {
  customerId: string
  userId: string
  plan: PlanId
  trialEndsAt?: string | null
}): Promise<{ subscriptionId: string; invoiceUrl: string | null }> {
  const p = PLANS[o.plan]
  const today = new Date().toISOString().slice(0, 10)
  // Honra o trial: se ainda está em teste, a 1ª cobrança cai no fim do trial.
  const nextDueDate =
    o.trialEndsAt && o.trialEndsAt.slice(0, 10) > today ? o.trialEndsAt.slice(0, 10) : today

  const sub = await asaas('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: o.customerId,
      billingType: 'UNDEFINED', // deixa o cliente escolher Pix / boleto / cartão
      value: p.value,
      nextDueDate,
      cycle: p.cycle,
      description: `Sapien Premium (${o.plan === 'yearly' ? 'anual' : 'mensal'})`,
      externalReference: o.userId
    })
  })

  // Link de pagamento da 1ª cobrança gerada pela assinatura.
  let invoiceUrl: string | null = null
  try {
    const pays = await asaas(`/subscriptions/${sub.id}/payments`)
    invoiceUrl = pays?.data?.[0]?.invoiceUrl ?? null
  } catch {
    /* sem cobrança ainda (ex.: 1ª só no fim do trial) — o link vem depois */
  }
  return { subscriptionId: sub.id as string, invoiceUrl }
}

/** Cancela a assinatura no Asaas. */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await asaas(`/subscriptions/${subscriptionId}`, { method: 'DELETE' })
}

export { asaas }
