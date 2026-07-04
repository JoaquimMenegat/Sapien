import type { BookStatus, BookFormat } from '../../../../shared/types'

// Metadados de exibição dos status. As cores vivas dão o toque "dado colorido"
// pedido, contrastando com a base neutra estilo Notion.
export const STATUS_META: Record<
  BookStatus,
  { label: string; dot: string; text: string; soft: string }
> = {
  wishlist: { label: 'Wishlist', dot: 'bg-pink-500', text: 'text-pink-600 dark:text-pink-400', soft: 'bg-pink-500/10' },
  fila: { label: 'Na fila', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', soft: 'bg-amber-500/10' },
  lendo: { label: 'Lendo', dot: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', soft: 'bg-sky-500/10' },
  pausado: { label: 'Pausado', dot: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', soft: 'bg-violet-500/10' },
  lido: { label: 'Lido', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', soft: 'bg-emerald-500/10' }
}

export const STATUS_ORDER: BookStatus[] = ['wishlist', 'fila', 'lendo', 'pausado', 'lido']

export const FORMAT_META: Record<BookFormat, string> = {
  fisico: 'Físico',
  ebook: 'Ebook',
  audiolivro: 'Audiolivro',
  kindle: 'Kindle'
}

export const FORMAT_ORDER: BookFormat[] = ['fisico', 'ebook', 'audiolivro', 'kindle']

export const LANGUAGE_LABELS: Record<string, string> = {
  pt: 'Português',
  en: 'Inglês',
  es: 'Espanhol',
  fr: 'Francês',
  de: 'Alemão',
  it: 'Italiano'
}
