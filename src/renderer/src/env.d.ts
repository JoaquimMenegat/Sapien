/// <reference types="vite/client" />
import type { ReadDeckApi } from '../../shared/types'

declare global {
  interface Window {
    readdeck: ReadDeckApi
  }
}

export {}
