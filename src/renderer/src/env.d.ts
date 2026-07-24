/// <reference types="vite/client" />
import type { ReadDeckApi } from '../../shared/types'

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Site key do Cloudflare Turnstile. Se ausente, o CAPTCHA fica desligado. */
  readonly VITE_TURNSTILE_SITE_KEY?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    readdeck: ReadDeckApi
  }
}

export {}
