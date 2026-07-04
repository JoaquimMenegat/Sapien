import { BookOpen, Star } from 'lucide-react'
import type { BookStatus } from '../../../../shared/types'
import { STATUS_META } from './constants'

export function BookCover({
  url,
  title,
  className = ''
}: {
  url: string | null
  title: string
  className?: string
}): JSX.Element {
  if (url) {
    return (
      <img
        src={url}
        alt={`Capa de ${title}`}
        loading="lazy"
        className={`object-cover ${className}`}
      />
    )
  }
  return (
    <div
      className={`flex items-center justify-center bg-surface text-ink-faint ${className}`}
      aria-label={`Sem capa para ${title}`}
    >
      <BookOpen size={22} />
    </div>
  )
}

export function StatusBadge({ status }: { status: BookStatus }): JSX.Element {
  const meta = STATUS_META[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${meta.soft} ${meta.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

// Exibição (não interativa) de nota em estrelas, 0–5.
export function StarRating({ value, size = 14 }: { value: number | null; size?: number }): JSX.Element | null {
  if (!value) return null
  return (
    <span className="inline-flex items-center gap-0.5" title={`${value} de 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < value ? 'fill-amber-400 text-amber-400' : 'text-ink-faint'}
        />
      ))}
    </span>
  )
}

// Seletor interativo de estrelas para formulários.
export function StarInput({
  value,
  onChange,
  size = 20
}: {
  value: number | null
  onChange: (v: number | null) => void
  size?: number
}): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={size}
              className={value && n <= value ? 'fill-amber-400 text-amber-400' : 'text-ink-faint'}
            />
          </button>
        )
      })}
    </span>
  )
}
