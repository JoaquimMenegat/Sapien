// Endpoint de teste (de-risk): confirma que a Vercel serve funções em /api.
// Se GET https://sapienapp.com.br/api/health devolver este JSON, o caminho está aberto
// para os endpoints reais (subscribe / asaas-webhook). Usa só a API de resposta padrão
// do Node, sem depender de helpers específicos.
export default function handler(_req: unknown, res: any): void {
  res.statusCode = 200
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ ok: true, service: 'sapien-api', ts: new Date().toISOString() }))
}
