// Envio de e-mail via Resend (domínio sapienapp.com.br já verificado).
// Variáveis de ambiente no servidor (nunca com prefixo VITE_):
//   RESEND_API_KEY   chave da API do Resend
//   CRON_SECRET      segredo que protege os endpoints agendados

const FROM = 'Sapien <no-reply@sapienapp.com.br>'
const APP_URL = 'https://sapienapp.com.br/app'

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY ausente')
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html })
  })
  if (!r.ok) throw new Error(`Resend HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
}

/** Confere o segredo do cron (header da Vercel ou ?secret= de agendadores externos). */
export function authorizeCron(req: any): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = String(req.headers?.authorization || '')
  if (header === `Bearer ${secret}`) return true
  const url = new URL(req.url ?? '', 'http://x')
  return url.searchParams.get('secret') === secret
}

/** Casca HTML com a marca Sapien — tom de convite, nunca de cobrança. */
export function emailShell(title: string, bodyHtml: string, ctaLabel = 'Abrir o Sapien'): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#15171C;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#15171C;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1D2026;border:1px solid #272B33;border-radius:16px;overflow:hidden">
        <tr><td style="padding:28px 28px 0">
          <div style="font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;background:linear-gradient(135deg,#818cf8,#c4b5fd);-webkit-background-clip:text;background-clip:text;color:#818cf8">Sapien</div>
          <h1 style="margin:14px 0 0;font-size:21px;line-height:1.3;color:#F1F5F9;font-weight:800">${title}</h1>
        </td></tr>
        <tr><td style="padding:16px 28px 4px;color:#9AA3B2;font-size:15px;line-height:1.6">${bodyHtml}</td></tr>
        <tr><td style="padding:22px 28px 30px">
          <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 24px;border-radius:10px">${ctaLabel}</a>
        </td></tr>
        <tr><td style="padding:0 28px 26px;color:#64748B;font-size:12px;line-height:1.6;border-top:1px solid #272B33;padding-top:18px">
          Você recebe isto porque ativou os lembretes de leitura.
          Para desativar, abra o Sapien e vá em <b style="color:#9AA3B2">Personalização → Lembretes</b>.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`
}
