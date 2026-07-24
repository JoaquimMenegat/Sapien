import { useEffect, useRef } from 'react'

// CAPTCHA (Cloudflare Turnstile). Fica INATIVO enquanto VITE_TURNSTILE_SITE_KEY não
// existir — assim o código pode ir para produção antes de o CAPTCHA ser ligado no
// Supabase, sem quebrar cadastro/login.
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ''
export const captchaEnabled = !!TURNSTILE_SITE_KEY

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  remove?: (id: string) => void
}
declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SCRIPT_SRC
      s.async = true
      s.defer = true
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Falha ao carregar o CAPTCHA.'))
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

/**
 * Renderiza o desafio. Chama `onToken(token)` quando resolvido e `onToken(null)`
 * quando expira/falha. Mude `resetKey` para gerar um token novo (ele é de uso único,
 * então após um erro de login é preciso resetar).
 */
export function Turnstile({
  onToken,
  resetKey = 0
}: {
  onToken: (token: string | null) => void
  resetKey?: number
}): JSX.Element | null {
  const box = useRef<HTMLDivElement | null>(null)
  // Guarda o callback num ref para não re-renderizar o widget a cada render do pai.
  const cb = useRef(onToken)
  cb.current = onToken

  useEffect(() => {
    if (!captchaEnabled) return
    let widgetId: string | undefined
    let cancelled = false

    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return
        box.current.innerHTML = ''
        widgetId = window.turnstile.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          callback: (token: string) => cb.current(token),
          'expired-callback': () => cb.current(null),
          'error-callback': () => cb.current(null)
        })
      })
      .catch(() => cb.current(null))

    return () => {
      cancelled = true
      if (widgetId && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetId)
        } catch {
          /* widget já removido */
        }
      }
    }
  }, [resetKey])

  if (!captchaEnabled) return null
  return <div ref={box} className="flex justify-center" />
}
