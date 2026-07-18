import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { createSupabaseApi } from './lib/supabaseApi'
import './assets/main.css'

// Na build web (sem Electron/preload), a ponte window.readdeck é o cliente Supabase.
// No desktop, o preload já a injetou — então não sobrescrevemos.
if (!window.readdeck) {
  window.readdeck = createSupabaseApi()
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
