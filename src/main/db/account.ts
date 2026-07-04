// Autenticação local e offline. Uma única conta por instalação, guardada na tabela
// settings. A senha nunca é armazenada em texto — usamos scrypt (do módulo crypto
// nativo do Node, sem dependências externas) com salt aleatório por conta.

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { getSetting, setSetting } from './settings'
import type { AccountInfo, AuthResult } from '../../shared/types'

const KEYLEN = 64

function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, KEYLEN)
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const derived = scryptSync(password, salt, KEYLEN)
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function hasAccount(): boolean {
  return !!getSetting('account.email')
}

export function getAccountInfo(): AccountInfo | null {
  const email = getSetting('account.email')
  if (!email) return null
  return {
    email,
    name: getSetting('account.name') ?? '',
    picture: getSetting('account.picture') || null,
    provider: getSetting('account.provider') === 'google' ? 'google' : 'local'
  }
}

export function createAccount(email: string, name: string, password: string): AuthResult {
  if (hasAccount()) {
    return { ok: false, error: 'Já existe uma conta neste computador.' }
  }
  const normEmail = normalizeEmail(email)
  if (!isValidEmail(normEmail)) {
    return { ok: false, error: 'E-mail inválido.' }
  }
  if (password.length < 6) {
    return { ok: false, error: 'A senha precisa ter pelo menos 6 caracteres.' }
  }
  setSetting('account.email', normEmail)
  setSetting('account.name', name.trim())
  setSetting('account.hash', hashPassword(password))
  setSetting('account.provider', 'local')
  return { ok: true, account: getAccountInfo() ?? undefined }
}

// Cria/atualiza a conta a partir de um login com Google (sem senha local).
export function upsertGoogleAccount(email: string, name: string, picture: string): AuthResult {
  const normEmail = normalizeEmail(email)
  if (!isValidEmail(normEmail)) return { ok: false, error: 'E-mail do Google inválido.' }
  setSetting('account.email', normEmail)
  setSetting('account.name', (name || normEmail.split('@')[0]).trim())
  setSetting('account.picture', picture || '')
  setSetting('account.provider', 'google')
  return { ok: true, account: getAccountInfo() ?? undefined }
}

export function updateProfile(name: string, picture: string | null): AuthResult {
  if (!hasAccount()) return { ok: false, error: 'Nenhuma conta.' }
  if (name.trim()) setSetting('account.name', name.trim())
  setSetting('account.picture', picture ?? '')
  return { ok: true, account: getAccountInfo() ?? undefined }
}

export function verifyLogin(email: string, password: string): AuthResult {
  const stored = getSetting('account.hash')
  const storedEmail = getSetting('account.email')
  if (!storedEmail) {
    return { ok: false, error: 'Nenhuma conta cadastrada.' }
  }
  if (!stored) {
    return { ok: false, error: 'Esta conta entra com o Google.' }
  }
  if (normalizeEmail(email) !== storedEmail) {
    return { ok: false, error: 'E-mail ou senha incorretos.' }
  }
  if (!verifyPassword(password, stored)) {
    return { ok: false, error: 'E-mail ou senha incorretos.' }
  }
  return { ok: true, account: getAccountInfo() ?? undefined }
}
