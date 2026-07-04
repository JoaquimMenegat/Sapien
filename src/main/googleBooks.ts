// Busca de livros na API pública do Google Books. Roda no processo main (Node tem
// fetch nativo no Electron 33) para não esbarrar em CORS/CSP do renderer.
//
// Retorna VÁRIOS resultados/edições — o usuário escolhe qual e pode editar qualquer
// campo depois (a API é ponto de partida, não uma trava).

import type { GoogleBookResult } from '../shared/types'

const ENDPOINT = 'https://www.googleapis.com/books/v1/volumes'

interface GVolume {
  id: string
  volumeInfo?: {
    title?: string
    subtitle?: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    description?: string
    pageCount?: number
    categories?: string[]
    averageRating?: number
    ratingsCount?: number
    language?: string
    imageLinks?: { thumbnail?: string; smallThumbnail?: string }
    industryIdentifiers?: { type?: string; identifier?: string }[]
  }
}

function pickIsbn(ids?: { type?: string; identifier?: string }[]): string | null {
  if (!ids) return null
  const isbn13 = ids.find((i) => i.type === 'ISBN_13')
  const isbn10 = ids.find((i) => i.type === 'ISBN_10')
  return isbn13?.identifier ?? isbn10?.identifier ?? null
}

function normalizeCover(url?: string): string | null {
  if (!url) return null
  // Google devolve http e com "&edge=curl"; https é exigido pela CSP.
  return url.replace(/^http:\/\//, 'https://').replace('&edge=curl', '')
}

function toResult(v: GVolume): GoogleBookResult {
  const info = v.volumeInfo ?? {}
  return {
    google_books_id: v.id,
    title: info.title ?? 'Sem título',
    subtitle: info.subtitle ?? null,
    authors: info.authors?.join(', ') ?? null,
    publisher: info.publisher ?? null,
    published_date: info.publishedDate ?? null,
    synopsis: info.description ?? null,
    total_pages: typeof info.pageCount === 'number' && info.pageCount > 0 ? info.pageCount : null,
    genres: info.categories?.join(', ') ?? null,
    cover_url: normalizeCover(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail),
    isbn: pickIsbn(info.industryIdentifiers),
    language: info.language ?? null,
    public_rating: typeof info.averageRating === 'number' ? info.averageRating : null,
    ratings_count: typeof info.ratingsCount === 'number' ? info.ratingsCount : null
  }
}

export async function searchGoogleBooks(query: string): Promise<GoogleBookResult[]> {
  const q = query.trim()
  if (!q) return []

  // Se parecer um ISBN (só dígitos/hífens, 10 ou 13), busca por isbn:.
  const digits = q.replace(/[-\s]/g, '')
  const isIsbn = /^\d{10}(\d{3})?$/.test(digits)
  const term = isIsbn ? `isbn:${digits}` : q

  const url = `${ENDPOINT}?q=${encodeURIComponent(term)}&maxResults=20&printType=books&country=BR`

  // Uma tentativa + um retry curto em caso de 429 (limite de taxa do IP).
  for (let attempt = 1; attempt <= 2; attempt++) {
    let res: Response
    try {
      res = await fetch(url)
    } catch (err) {
      throw new Error(`Sem conexão para buscar no Google Books (${String(err)}).`)
    }
    if (res.ok) {
      const data = (await res.json()) as { items?: GVolume[] }
      return (data.items ?? []).map(toResult)
    }
    if (res.status === 429 && attempt === 1) {
      await new Promise((r) => setTimeout(r, 1500))
      continue
    }
    if (res.status === 429) {
      throw new Error('Muitas buscas em pouco tempo. Espere alguns segundos e tente de novo.')
    }
    throw new Error(`Google Books respondeu ${res.status}.`)
  }
  return []
}
