// Capas locais: o usuário escolhe uma imagem do computador, copiamos para
// userData/covers e servimos via um protocolo próprio (readdeck-cover://), evitando
// depender de file:// (que a CSP bloqueia) e mantendo o banco leve (guardamos só a URL).

import { app, dialog, protocol, net } from 'electron'
import { join, extname, basename } from 'path'
import { mkdirSync, copyFileSync } from 'fs'
import { randomUUID } from 'crypto'

function coversDir(): string {
  return join(app.getPath('userData'), 'covers')
}

export function ensureCoversDir(): void {
  mkdirSync(coversDir(), { recursive: true })
}

// Deve ser chamado ANTES do app ficar pronto (registra o esquema como privilegiado).
export function registerCoverScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'readdeck-cover',
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }
  ])
}

// Deve ser chamado DEPOIS do app pronto.
export function registerCoverProtocol(): void {
  protocol.handle('readdeck-cover', (request) => {
    const u = new URL(request.url)
    const name = basename(decodeURIComponent(u.pathname || u.hostname))
    const filePath = join(coversDir(), name).replace(/\\/g, '/')
    return net.fetch(`file:///${filePath}`)
  })
}

export async function pickCover(): Promise<string | null> {
  const res = await dialog.showOpenDialog({
    title: 'Escolher capa do livro',
    properties: ['openFile'],
    filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
  })
  if (res.canceled || res.filePaths.length === 0) return null

  ensureCoversDir()
  const src = res.filePaths[0]
  const ext = extname(src).toLowerCase() || '.jpg'
  const name = `cover-${randomUUID()}${ext}`
  copyFileSync(src, join(coversDir(), name))
  return `readdeck-cover://local/${name}`
}
