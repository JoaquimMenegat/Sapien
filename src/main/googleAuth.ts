// "Entrar com Google" — fluxo OAuth 2.0 para app desktop (loopback + PKCE).
// Requer um Client ID/Secret do tipo "Desktop app" criado pelo usuário no Google
// Cloud, guardado localmente em settings. Abre o navegador padrão, recebe o code
// num servidor http temporário em 127.0.0.1 e troca por tokens + dados do perfil.

import { shell } from 'electron'
import { createServer } from 'http'
import { randomBytes, createHash } from 'crypto'
import { getSetting, setSetting } from './db/settings'

export interface GoogleUser {
  ok: boolean
  email?: string
  name?: string
  picture?: string
  error?: string
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function googleConfigured(): boolean {
  return !!getSetting('google.clientId') && !!getSetting('google.clientSecret')
}

export function setGoogleConfig(clientId: string, clientSecret: string): void {
  setSetting('google.clientId', clientId.trim())
  setSetting('google.clientSecret', clientSecret.trim())
}

const DONE_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Sapien</title></head>
<body style="font-family:system-ui,sans-serif;background:#1a1917;color:#ece9e2;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">
<div style="text-align:center"><h2 style="color:#da7756">Login concluído ✓</h2><p>Você já pode voltar ao Sapien.</p></div></body></html>`

export async function googleSignIn(): Promise<GoogleUser> {
  const clientId = getSetting('google.clientId')
  const clientSecret = getSetting('google.clientSecret')
  if (!clientId || !clientSecret) {
    return { ok: false, error: 'Configure o Client ID do Google primeiro.' }
  }

  const verifier = b64url(randomBytes(32))
  const challenge = b64url(createHash('sha256').update(verifier).digest())
  const state = b64url(randomBytes(16))

  return new Promise<GoogleUser>((resolve) => {
    let settled = false
    const finish = (r: GoogleUser): void => {
      if (settled) return
      settled = true
      try {
        server.close()
      } catch {
        /* noop */
      }
      resolve(r)
    }

    const server = createServer(async (req, res) => {
      try {
        const u = new URL(req.url ?? '/', 'http://127.0.0.1')
        const code = u.searchParams.get('code')
        if (!code) {
          res.writeHead(400)
          res.end('sem code')
          return
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(DONE_HTML)

        if (u.searchParams.get('state') !== state) return finish({ ok: false, error: 'Estado inválido (possível interferência).' })

        const port = (server.address() as { port: number }).port
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `http://127.0.0.1:${port}`,
            grant_type: 'authorization_code',
            code_verifier: verifier
          })
        })
        if (!tokenRes.ok) return finish({ ok: false, error: 'Falha ao trocar o código por token no Google.' })
        const tok = (await tokenRes.json()) as { access_token?: string }
        if (!tok.access_token) return finish({ ok: false, error: 'Google não devolveu um token de acesso.' })

        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tok.access_token}` }
        })
        if (!infoRes.ok) return finish({ ok: false, error: 'Falha ao ler o perfil do Google.' })
        const info = (await infoRes.json()) as { email?: string; name?: string; picture?: string }
        if (!info.email) return finish({ ok: false, error: 'O Google não forneceu um e-mail.' })
        finish({ ok: true, email: info.email, name: info.name, picture: info.picture })
      } catch (err) {
        finish({ ok: false, error: `Erro no login com Google: ${String(err)}` })
      }
    })

    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as { port: number }).port
      const authUrl =
        'https://accounts.google.com/o/oauth2/v2/auth?' +
        new URLSearchParams({
          client_id: clientId,
          redirect_uri: `http://127.0.0.1:${port}`,
          response_type: 'code',
          scope: 'openid email profile',
          code_challenge: challenge,
          code_challenge_method: 'S256',
          state,
          access_type: 'online',
          prompt: 'select_account'
        }).toString()
      void shell.openExternal(authUrl)
    })

    setTimeout(() => finish({ ok: false, error: 'Tempo esgotado no login com Google.' }), 180000)
  })
}
