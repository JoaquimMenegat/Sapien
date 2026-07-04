// Helpers de chave/valor sobre a tabela settings (tema, ritmo de leitura, config do
// Pomodoro, etc.). Simples, mas centraliza toda a persistência de preferências.

import { get, run } from './index'

export function getSetting(key: string): string | null {
  const row = get<{ value: string | null }>('SELECT value FROM settings WHERE key = ?', [key])
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  )
}
