import { useState, type FormEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import type { BookDraft, BookStatus, BookFormat } from '../../../../shared/types'
import { STATUS_ORDER, STATUS_META, FORMAT_ORDER, FORMAT_META, LANGUAGE_LABELS } from './constants'
import { BookCover, StarInput } from './BookBits'
import { GenrePicker } from './GenrePicker'

interface Props {
  initial: Partial<BookDraft>
  submitLabel: string
  busy?: boolean
  onSubmit: (draft: BookDraft) => void
  onCancel?: () => void
}

type State = {
  title: string
  subtitle: string
  authors: string
  publisher: string
  isbn: string
  cover_url: string
  language: string
  genres: string
  synopsis: string
  verdict: string
  total_pages: string
  current_page: string
  status: BookStatus
  format: BookFormat | ''
  rating: number | null
  public_rating: number | null
  ratings_count: number | null
  google_books_id: string
}

function toState(d: Partial<BookDraft>): State {
  return {
    title: d.title ?? '',
    subtitle: d.subtitle ?? '',
    authors: d.authors ?? '',
    publisher: d.publisher ?? '',
    isbn: d.isbn ?? '',
    cover_url: d.cover_url ?? '',
    language: d.language ?? '',
    genres: d.genres ?? '',
    synopsis: d.synopsis ?? '',
    verdict: d.verdict ?? '',
    total_pages: d.total_pages != null ? String(d.total_pages) : '',
    current_page: d.current_page != null ? String(d.current_page) : '',
    status: d.status ?? 'wishlist',
    format: d.format ?? '',
    rating: d.rating ?? null,
    public_rating: d.public_rating ?? null,
    ratings_count: d.ratings_count ?? null,
    google_books_id: d.google_books_id ?? ''
  }
}

function num(s: string): number | null {
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}

export function BookForm({ initial, submitLabel, busy, onSubmit, onCancel }: Props): JSX.Element {
  const [f, setF] = useState<State>(() => toState(initial))
  const set = <K extends keyof State>(k: K, v: State[K]): void => setF((p) => ({ ...p, [k]: v }))

  async function chooseCoverFile(): Promise<void> {
    const url = await window.readdeck.books.pickCover()
    if (url) set('cover_url', url)
  }

  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    onSubmit({
      title: f.title.trim() || 'Sem título',
      subtitle: f.subtitle.trim() || null,
      authors: f.authors.trim() || null,
      publisher: f.publisher.trim() || null,
      isbn: f.isbn.trim() || null,
      cover_url: f.cover_url.trim() || null,
      language: f.language.trim() || null,
      genres: f.genres.trim() || null,
      synopsis: f.synopsis.trim() || null,
      verdict: f.verdict.trim() || null,
      total_pages: num(f.total_pages),
      current_page: num(f.current_page) ?? 0,
      status: f.status,
      format: f.format || null,
      rating: f.rating,
      public_rating: f.public_rating,
      ratings_count: f.ratings_count,
      google_books_id: f.google_books_id || null
    })
  }

  const label = 'mb-1 block text-xs font-medium text-ink-soft'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-4">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <BookCover
            url={f.cover_url || null}
            title={f.title}
            className="h-40 w-28 rounded-lg border border-edge"
          />
          <button
            type="button"
            onClick={chooseCoverFile}
            className="btn-ghost w-28 justify-center px-2 py-1.5 text-xs"
          >
            <ImagePlus size={14} /> Escolher capa
          </button>
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <span className={label}>Título</span>
            <input required value={f.title} onChange={(e) => set('title', e.target.value)} className="field" />
          </div>
          <div>
            <span className={label}>Subtítulo</span>
            <input value={f.subtitle} onChange={(e) => set('subtitle', e.target.value)} className="field" />
          </div>
          <div>
            <span className={label}>Autor(es)</span>
            <input value={f.authors} onChange={(e) => set('authors', e.target.value)} className="field" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className={label}>Editora</span>
          <input value={f.publisher} onChange={(e) => set('publisher', e.target.value)} className="field" />
        </div>
        <div>
          <span className={label}>ISBN</span>
          <input value={f.isbn} onChange={(e) => set('isbn', e.target.value)} className="field" />
        </div>
        <div>
          <span className={label}>Status</span>
          <select value={f.status} onChange={(e) => set('status', e.target.value as BookStatus)} className="field">
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className={label}>Formato</span>
          <select value={f.format} onChange={(e) => set('format', e.target.value as BookFormat | '')} className="field">
            <option value="">—</option>
            {FORMAT_ORDER.map((fm) => (
              <option key={fm} value={fm}>
                {FORMAT_META[fm]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className={label}>Páginas totais</span>
          <input type="number" min="0" value={f.total_pages} onChange={(e) => set('total_pages', e.target.value)} className="field" />
        </div>
        <div>
          <span className={label}>Página atual</span>
          <input type="number" min="0" value={f.current_page} onChange={(e) => set('current_page', e.target.value)} className="field" />
        </div>
        <div>
          <span className={label}>Idioma</span>
          <input
            value={LANGUAGE_LABELS[f.language] ?? f.language}
            onChange={(e) => set('language', e.target.value)}
            placeholder="pt, en…"
            className="field"
          />
        </div>
      </div>

      <div>
        <span className={label}>Sua avaliação</span>
        <StarInput value={f.rating} onChange={(v) => set('rating', v)} />
      </div>

      <div>
        <span className={label}>Gêneros</span>
        <GenrePicker value={f.genres} onChange={(v) => set('genres', v)} />
      </div>

      <div>
        <span className={label}>URL da capa</span>
        <input value={f.cover_url} onChange={(e) => set('cover_url', e.target.value)} className="field" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancelar
          </button>
        )}
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? 'Salvando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
