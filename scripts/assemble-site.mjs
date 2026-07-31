// Monta o site final para deploy:
//   dist-web/            → landing de marketing (landing/*) na raiz
//   dist-web/app/        → o SPA React (gerado pelo vite build, base '/app/')
//
// Rodado após o `vite build` em `npm run build:web`. Copia recursivamente o
// conteúdo de landing/ para dist-web/, sem tocar em dist-web/app.
import { cp, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const landing = resolve(root, 'landing')
const dist = resolve(root, 'dist-web')

if (!existsSync(landing)) {
  console.error('assemble-site: pasta landing/ não encontrada em', landing)
  process.exit(1)
}
await mkdir(dist, { recursive: true })

// Copia landing/* → dist-web/* (recursivo). Não remove o que já existe (o /app).
await cp(landing, dist, { recursive: true })

console.log('assemble-site: landing copiada para dist-web/ (app permanece em dist-web/app)')
