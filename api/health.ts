// Endpoint de teste (de-risk): confirma que a Vercel serve funções em /api.
// Se GET https://sapienapp.com.br/api/health devolver este JSON, o caminho está aberto
// para os endpoints reais (subscribe / asaas-webhook). Usa só a API de resposta padrão
// do Node, sem depender de helpers específicos.
export default function handler(_req: unknown, res: any): void {
  // Só expõe PRESENÇA (true/false), nunca o valor — seguro de ficar público.
  const env = {
    supabaseUrl: !!process.env.VITE_SUPABASE_URL,
    anonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    asaasKey: !!process.env.ASAAS_API_KEY,
    asaasBaseUrl: !!process.env.ASAAS_BASE_URL,
    webhookToken: !!process.env.ASAAS_WEBHOOK_TOKEN
  }
  res.statusCode = 200
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ ok: true, service: 'sapien-api', env, ts: new Date().toISOString() }))
}
