// Busca de livros na versão WEB. Espelha o que o desktop faz em src/main/bookSearch.ts:
// consulta Google Books E Open Library em paralelo, junta, remove duplicatas (por ISBN)
// e ordena priorizando as edições mais completas (capa, páginas, sinopse, português).
//
// Por que as duas fontes: sem chave de API, o Google Books usa uma cota compartilhada
// que vive esgotada (responde 429). A Open Library é gratuita, sem chave e bem mais
// tolerante — então a busca continua funcionando mesmo quando o Google recusa.

import type { GoogleBookResult } from '../../../shared/types'

// --- Google Books ---

async function searchGoogle(query: string): Promise<GoogleBookResult[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&langRestrict=pt`
  const res = await fetch(url, { signal: AbortSignal.timeout(9000) })
  if (res.status === 429) throw new Error('Google Books atingiu o limite de consultas.')
  if (!res.ok) throw new Error(`Google Books respondeu ${res.status}.`)

  const json = (await res.json()) as { items?: Array<{ id: string; volumeInfo?: Record<string, unknown> }> }
  return (json.items ?? []).map((it) => {
    const v = (it.volumeInfo ?? {}) as Record<string, unknown>
    const ids = (v.industryIdentifiers as Array<{ type: string; identifier: string }>) ?? []
    const isbn =
      ids.find((x) => x.type === 'ISBN_13')?.identifier ??
      ids.find((x) => x.type === 'ISBN_10')?.identifier ??
      null
    const img = (v.imageLinks as Record<string, string>)?.thumbnail
    return {
      google_books_id: it.id,
      title: (v.title as string) ?? 'Sem título',
      subtitle: (v.subtitle as string) ?? null,
      authors: (v.authors as string[])?.join(', ') ?? null,
      publisher: (v.publisher as string) ?? null,
      published_date: (v.publishedDate as string) ?? null,
      synopsis: (v.description as string) ?? null,
      total_pages: (v.pageCount as number) ?? null,
      genres: (v.categories as string[])?.join(', ') ?? null,
      cover_url: img ? img.replace('http://', 'https://') : null,
      isbn,
      language: (v.language as string) ?? null,
      public_rating: (v.averageRating as number) ?? null,
      ratings_count: (v.ratingsCount as number) ?? null
    }
  })
}

// --- Open Library ---

const LANG_MAP: Record<string, string> = {
  por: 'pt', eng: 'en', spa: 'es', fre: 'fr', ger: 'de', ita: 'it'
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

async function searchOpenLibrary(query: string): Promise<GoogleBookResult[]> {
  const digits = query.replace(/[-\s]/g, '')
  const isIsbn = /^\d{10}(\d{3})?$/.test(digits)
  const params = new URLSearchParams({
    limit: '20',
    fields:
      'key,title,subtitle,author_name,first_publish_year,publisher,isbn,number_of_pages_median,cover_i,language'
  })
  if (isIsbn) params.set('isbn', digits)
  else params.set('q', query)

  const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
    signal: AbortSignal.timeout(9000)
  })
  if (!res.ok) throw new Error(`Open Library respondeu ${res.status}.`)

  const data = (await res.json()) as { docs?: OLDoc[] }
  return (data.docs ?? [])
    .filter((d) => d.title)
    .map((d) => {
      const lang = d.language?.[0]
      return {
        google_books_id: d.key ? `ol:${d.key}` : `ol:${d.title}`,
        title: d.title ?? 'Sem título',
        subtitle: d.subtitle ?? null,
        authors: d.author_name?.join(', ') ?? null,
        publisher: d.publisher?.[0] ?? null,
        published_date: d.first_publish_year ? String(d.first_publish_year) : null,
        synopsis: null, // exigiria uma 2ª chamada ao "work"; fica para edição manual
        total_pages: typeof d.number_of_pages_median === 'number' ? d.number_of_pages_median : null,
        genres: null,
        cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
        isbn: d.isbn?.[0] ?? null,
        language: lang ? (LANG_MAP[lang] ?? lang) : null,
        public_rating: null,
        ratings_count: null
      }
    })
}

// --- Junção, ordenação e deduplicação ---

function score(r: GoogleBookResult): number {
  let s = 0
  if (r.cover_url) s += 3
  if (r.total_pages) s += 2
  if (r.synopsis) s += 2
  if (r.language === 'pt') s += 2
  if (r.publisher) s += 1
  return s
}

function keyOf(r: GoogleBookResult): string {
  if (r.isbn) return 'isbn:' + r.isbn.replace(/[^0-9Xx]/g, '').toUpperCase()
  return `t:${r.title}|${r.authors ?? ''}`.toLowerCase().replace(/\s+/g, ' ').trim()
}

export async function searchBooks(query: string): Promise<GoogleBookResult[]> {
  const q = query.trim()
  if (!q) return []

  const [g, o] = await Promise.allSettled([searchGoogle(q), searchOpenLibrary(q)])

  const all: GoogleBookResult[] = []
  if (g.status === 'fulfilled') all.push(...g.value)
  if (o.status === 'fulfilled') all.push(...o.value)

  if (all.length === 0) {
    // Se as DUAS fontes falharam, avisa em vez de devolver uma lista vazia silenciosa.
    if (g.status === 'rejected' && o.status === 'rejected') {
      throw new Error('Não foi possível buscar livros agora. Tente novamente em instantes.')
    }
    return []
  }

  // Para cada edição, mantém a versão com dados mais completos.
  const best = new Map<string, { r: GoogleBookResult; s: number }>()
  for (const r of all) {
    const k = keyOf(r)
    const s = score(r)
    const cur = best.get(k)
    if (!cur || s > cur.s) best.set(k, { r, s })
  }
  return [...best.values()].sort((a, b) => b.s - a.s).map((x) => x.r).slice(0, 30)
}
