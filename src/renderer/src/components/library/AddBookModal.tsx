import { useState, type FormEvent } from 'react'
import { Search, Plus, ArrowLeft, Loader2 } from 'lucide-react'
import type { BookDraft, GoogleBookResult } from '../../../../shared/types'
import { useBooks } from '../../store/books'
import { Modal } from '../ui/Modal'
import { BookForm } from './BookForm'
import { BookCover } from './BookBits'

function resultToDraft(r: GoogleBookResult): Partial<BookDraft> {
  return {
    google_books_id: r.google_books_id,
    title: r.title,
    subtitle: r.subtitle,
    authors: r.authors,
    publisher: r.publisher,
    synopsis: r.synopsis,
    total_pages: r.total_pages,
    genres: r.genres,
    cover_url: r.cover_url,
    isbn: r.isbn,
    language: r.language,
    public_rating: r.public_rating,
    ratings_count: r.ratings_count,
    status: 'wishlist'
  }
}

export function AddBookModal({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): JSX.Element {
  const searchBooks = useBooks((s) => s.searchBooks)
  const addBook = useBooks((s) => s.addBook)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GoogleBookResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [draft, setDraft] = useState<Partial<BookDraft> | null>(null)
  const [saving, setSaving] = useState(false)

  function reset(): void {
    setQuery('')
    setResults([])
    setSearching(false)
    setError(null)
    setSearched(false)
    setDraft(null)
    setSaving(false)
  }

  function close(): void {
    reset()
    onClose()
  }

  async function handleSearch(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    try {
      const res = await searchBooks(query)
      setResults(res)
      setSearched(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setSearching(false)
    }
  }

  async function handleSave(d: BookDraft): Promise<void> {
    setSaving(true)
    try {
      await addBook(d)
      close()
    } catch (err) {
      setError(String(err))
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      wide
      title={draft ? 'Revisar e adicionar' : 'Adicionar livro'}
    >
      {draft ? (
        <div className="space-y-4">
          <button
            onClick={() => setDraft(null)}
            className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
          >
            <ArrowLeft size={15} /> Voltar à busca
          </button>
          <p className="text-sm text-ink-faint">
            Ajuste o que quiser antes de salvar — edição, editora, páginas, status, tudo é editável.
          </p>
          <BookForm
            initial={draft}
            submitLabel="Adicionar à estante"
            busy={saving}
            onSubmit={handleSave}
            onCancel={() => setDraft(null)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busque por título, autor ou ISBN…"
                className="field pl-9"
              />
            </div>
            <button type="submit" disabled={searching} className="btn-primary">
              {searching ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
            </button>
          </form>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="max-h-[46vh] space-y-1.5 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.google_books_id}
                onClick={() => setDraft(resultToDraft(r))}
                className="flex w-full items-start gap-3 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-edge hover:bg-ink/[0.03]"
              >
                <BookCover
                  url={r.cover_url}
                  title={r.title}
                  className="h-16 w-11 shrink-0 rounded border border-edge"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{r.title}</p>
                  {r.authors && <p className="truncate text-xs text-ink-soft">{r.authors}</p>}
                  <p className="truncate text-xs text-ink-faint">
                    {[r.publisher, r.published_date?.slice(0, 4), r.total_pages && `${r.total_pages} p.`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <Plus size={16} className="mt-1 shrink-0 text-ink-faint" />
              </button>
            ))}

            {searched && !searching && results.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-faint">
                Nenhum resultado. Você pode adicionar manualmente.
              </p>
            )}
          </div>

          <div className="flex justify-between border-t border-edge pt-3">
            <button
              onClick={() => setDraft({ status: 'wishlist' })}
              className="btn-ghost"
            >
              <Plus size={15} /> Adicionar manualmente
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
