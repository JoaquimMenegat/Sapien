// Fonte alternativa de busca de livros: Open Library (openlibrary.org). Gratuita,
// sem chave e com limite bem mais tolerante que o Google Books — usada como fallback
// quando o Google falha ou é limitado (429).

import type { GoogleBookResult } from '../shared/types'

const ENDPOINT = 'https://openlibrary.org/search.json'

// MARC (3 letras) -> códigos de 2 letras usados no app.
const LANG_MAP: Record<string, string> = {
  por: 'pt',
  eng: 'en',
  spa: 'es',
  fre: 'fr',
  ger: 'de',
  ita: 'it'
}

interface OLDoc {
  key?: string
  title?: string
  subtitle?: string
  author_name?: string[]
  first_publish_year?: number
  publisher?: string[]
  isbn?: string[]
  number_of_pages_median?: number
  cover_i?: number
  language?: string[]
}

function toResult(d: OLDoc): GoogleBookResult {
  const lang = d.language?.[0]
  return {
    google_books_id: d.key ? `ol:${d.key}` : `ol:${d.title ?? Math.random()}`,
    title: d.title ?? 'Sem título',
    subtitle: d.subtitle ?? null,
    authors: d.author_name?.join(', ') ?? null,
    publisher: d.publisher?.[0] ?? null,
    published_date: d.first_publish_year ? String(d.first_publish_year) : null,
    synopsis: null, // a sinopse exige uma 2ª chamada ao "work"; deixamos p/ edição manual
    total_pages:
      typeof d.number_of_pages_median === 'number' ? d.number_of_pages_median : null,
    genres: null,
    cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    isbn: d.isbn?.[0] ?? null,
    language: lang ? (LANG_MAP[lang] ?? lang) : null,
    public_rating: null,
    ratings_count: null
  }
}

export async function searchOpenLibrary(query: string): Promise<GoogleBookResult[]> {
  const q = query.trim()
  if (!q) return []

  const digits = q.replace(/[-\s]/g, '')
  const isIsbn = /^\d{10}(\d{3})?$/.test(digits)
  const params = new URLSearchParams({
    limit: '20',
    fields:
      'key,title,subtitle,author_name,first_publish_year,publisher,isbn,number_of_pages_median,cover_i,language'
  })
  if (isIsbn) params.set('isbn', digits)
  else params.set('q', q)

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, { signal: AbortSignal.timeout(9000) })
  if (!res.ok) throw new Error(`Open Library respondeu ${res.status}.`)
  const data = (await res.json()) as { docs?: OLDoc[] }
  return (data.docs ?? []).filter((d) => d.title).map(toResult)
}
