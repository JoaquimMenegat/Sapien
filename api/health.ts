// Health check mínimo: confirma que a Vercel serve funções em /api.
// Não expõe nada sensível — só um "pong" com timestamp.
export default function handler(_req: unknown, res: any): void {
  res.statusCode = 200
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ ok: true, service: 'sapien-api', ts: new Date().toISOString() }))
}
