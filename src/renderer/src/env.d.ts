/// <reference types="vite/client" />
import type { ReadDeckApi } from '../../shared/types'

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
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
