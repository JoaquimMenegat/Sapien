// Orquestra a busca de livros: tenta Google Books (dados mais ricos, com sinopse) e,
// se falhar ou não retornar nada, cai na Open Library (mais tolerante a limite).

import { searchGoogleBooks } from './googleBooks'
import { searchOpenLibrary } from './openLibrary'
import type { GoogleBookResult } from '../shared/types'

export async function searchBooks(query: string): Promise<GoogleBookResult[]> {
  if (!query.trim()) return []

  let googleError: unknown = null
  try {
    const google = await searchGoogleBooks(query)
    if (google.length > 0) return google
  } catch (err) {
    googleError = err
  }

  // Fallback: Open Library.
  try {
    const ol = await searchOpenLibrary(query)
    if (ol.length > 0) return ol
  } catch (olError) {
    // Se ambos falharam, informa o erro mais útil.
    if (googleError) throw googleError
    throw olError
  }

  // Nenhuma fonte retornou resultados (e nenhuma "falhou").
  return []
}
