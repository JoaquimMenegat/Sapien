// Camada de acesso ao banco. Usa sql.js (SQLite em WebAssembly), portanto o banco
// vive em memória e é serializado para disco após escritas (debounced) e ao sair.
//
// Por que sql.js em vez de better-sqlite3: better-sqlite3 é um módulo nativo que
// exige recompilação para o ABI do Electron (ferramentas de build C++). sql.js é
// WASM puro — zero compilação, mesmo binário em Windows/macOS/Linux.

import { app } from 'electron'
import { join, dirname } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import { SCHEMA_SQL } from './schema'

let db: Database | null = null
let dbPath = ''
let saveTimer: NodeJS.Timeout | null = null

/** Localiza o binário .wasm dentro de node_modules de forma robusta. */
function resolveWasmBinary(): ArrayBuffer {
  // O entry-point do sql.js é .../sql.js/dist/sql-wasm.js; o .wasm fica ao lado.
  // (Não dá pra resolver 'sql.js/package.json': o campo "exports" não o expõe.)
  const entry = require.resolve('sql.js')
  const wasmPath = join(dirname(entry), 'sql-wasm.wasm')
  const buf = readFileSync(wasmPath)
  // Devolve um ArrayBuffer "puro" (sql.js tipa wasmBinary como ArrayBuffer, e o
  // Buffer do Node não é atribuível a ele no TS estrito).
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs({ wasmBinary: resolveWasmBinary() })

  dbPath = join(app.getPath('userData'), 'readdeck.db')
  mkdirSync(dirname(dbPath), { recursive: true })

  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(SCHEMA_SQL)
  persistNow()
}

function ensureDb(): Database {
  if (!db) throw new Error('Banco não inicializado. Chame initDatabase() primeiro.')
  return db
}

/** Salva imediatamente o estado do banco em disco. */
export function persistNow(): void {
  if (!db) return
  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))
}

/** Agenda uma gravação em disco, agrupando escritas próximas no tempo. */
function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(persistNow, 400)
}

/** Executa SQL sem retorno (INSERT/UPDATE/DELETE). Agenda persistência. */
export function run(sql: string, params: SqlValue[] = []): void {
  const database = ensureDb()
  database.run(sql, params)
  scheduleSave()
}

/** Retorna todas as linhas como objetos. */
export function all<T = Record<string, SqlValue>>(sql: string, params: SqlValue[] = []): T[] {
  const database = ensureDb()
  const stmt = database.prepare(sql)
  stmt.bind(params)
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return rows
}

/** Retorna a primeira linha ou null. */
export function get<T = Record<string, SqlValue>>(sql: string, params: SqlValue[] = []): T | null {
  const rows = all<T>(sql, params)
  return rows.length > 0 ? rows[0] : null
}

/** Insere e devolve o rowid gerado. */
export function insert(sql: string, params: SqlValue[] = []): number {
  run(sql, params)
  const row = get<{ id: number }>('SELECT last_insert_rowid() AS id')
  return row?.id ?? 0
}

export function getDbPath(): string {
  return dbPath
}

/** Flush final ao encerrar o app. */
export function closeDatabase(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  persistNow()
  db?.close()
  db = null
}
