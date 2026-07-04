// Orquestra a busca de livros: consulta Google Books E Open Library em paralelo,
// junta os resultados, remove duplicatas (por ISBN) e ordena priorizando edições
// mais "reais/à venda" — em português, com capa, páginas e sinopse. Assim o usuário
// vê MAIS edições e as mais prováveis primeiro (o mais perto viável de "o que está
// à venda", já que a Amazon não oferece API pública gratuita).

import { searchGoogleBooks } from './googleBooks'
import { searchOpenLibrary } from './openLibrary'
import type { GoogleBookResult } from '../shared/types'

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

function rankAndDedupe(list: GoogleBookResult[]): GoogleBookResult[] {
  // Mantém, para cada edição (chave), a versão de dados mais completa.
  const best = new Map<string, { r: GoogleBookResult; s: number }>()
  for (const r of list) {
    const k = keyOf(r)
    const s = score(r)
    const cur = best.get(k)
    if (!cur || s > cur.s) best.set(k, { r, s })
  }
  return [...best.values()].sort((a, b) => b.s - a.s).map((x) => x.r)
}

export async function searchBooks(query: string): Promise<GoogleBookResult[]> {
  if (!query.trim()) return []

  const [g, o] = await Promise.allSettled([searchGoogleBooks(query), searchOpenLibrary(query)])

  const results: GoogleBookResult[] = []
  if (g.status === 'fulfilled') results.push(...g.value)
  if (o.status === 'fulfilled') results.push(...o.value)

  if (results.length === 0) {
    // Nada veio: se ambas as fontes falharam, propaga o erro mais informativo.
    if (g.status === 'rejected' && o.status === 'rejected') {
      throw g.reason ?? o.reason
    }
    return []
  }

  return rankAndDedupe(results).slice(0, 30)
}
