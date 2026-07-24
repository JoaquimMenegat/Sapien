import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// O link de "redefinir senha" do e-mail chega como #access_token=...&type=recovery.
// Lemos o hash AQUI, no import do módulo — antes de o cliente ser criado (é lazy) e
// consumir/limpar a URL. Assim o App sabe que deve pedir uma senha nova em vez de
// simplesmente entrar (a sessão do link já vem autenticada).
const initialHash = typeof window !== 'undefined' ? window.location.hash : ''
export const openedFromRecoveryLink = /(^|[#&])type=recovery(&|$)/.test(initialHash)

// Cliente Supabase criado sob demanda (só na build web; no desktop nunca é chamado).
let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
    }
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  }
  return client
}
