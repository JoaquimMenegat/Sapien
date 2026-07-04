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
  return !!getSetting('account.hash')
}

export function getAccountInfo(): AccountInfo | null {
  const email = getSetting('account.email')
  const name = getSetting('account.name')
  if (!email) return null
  return { email, name: name ?? '' }
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
  return { ok: true, account: { email: normEmail, name: name.trim() } }
}

export function verifyLogin(email: string, password: string): AuthResult {
  const stored = getSetting('account.hash')
  const storedEmail = getSetting('account.email')
  if (!stored || !storedEmail) {
    return { ok: false, error: 'Nenhuma conta cadastrada.' }
  }
  if (normalizeEmail(email) !== storedEmail) {
    return { ok: false, error: 'E-mail ou senha incorretos.' }
  }
  if (!verifyPassword(password, stored)) {
    return { ok: false, error: 'E-mail ou senha incorretos.' }
  }
  return { ok: true, account: getAccountInfo() ?? undefined }
}
