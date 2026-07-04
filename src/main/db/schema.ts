// Esquema do banco (SQLite via sql.js). Uma migração idempotente por versão.
// Cada tabela reflete o modelo de dados do ReadDeck, inspirado na estante do Notion.

export const SCHEMA_SQL = /* sql */ `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS books (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  subtitle      TEXT,
  authors       TEXT,
  cover_url     TEXT,
  isbn          TEXT,
  total_pages   INTEGER,
  current_page  INTEGER NOT NULL DEFAULT 0,
  synopsis      TEXT,
  publisher     TEXT,
  language      TEXT,
  format        TEXT,
  genres        TEXT,
  status        TEXT NOT NULL DEFAULT 'wishlist',
  rating        INTEGER,
  public_rating REAL,
  ratings_count INTEGER,
  started_at    TEXT,
  finished_at   TEXT,
  verdict       TEXT,
  google_books_id TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reading_sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id      INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  started_at   TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at     TEXT,
  duration_min INTEGER NOT NULL DEFAULT 0,
  pages_read   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS goals (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL,
  target     INTEGER NOT NULL,
  period     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id    INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'nota',
  content    TEXT NOT NULL DEFAULT '',
  page_ref   INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_sessions_book ON reading_sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_notes_book ON notes(book_id);
`
