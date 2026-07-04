import { BookOpen, Star } from 'lucide-react'
import type { BookStatus } from '../../../../shared/types'
import { STATUS_META, STATUS_ORDER } from './constants'

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

// Progresso de leitura: barra + porcentagem + páginas lidas/total.
export function ReadingProgress({
  current,
  total,
  className = ''
}: {
  current: number
  total: number | null
  className?: string
}): JSX.Element | null {
  if (!total || total <= 0) return null
  const pct = Math.min(100, Math.round((current / total) * 100))
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.08]">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-ink-faint">
        <span className="font-medium text-ink-soft">{pct}%</span>
        <span>
          {current}/{total} páginas
        </span>
      </div>
    </div>
  )
}

// Seletor rápido de prateleira: linha de chips clicáveis (muda o status na hora).
export function StatusPicker({
  value,
  onChange
}: {
  value: BookStatus
  onChange: (s: BookStatus) => void
}): JSX.Element {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUS_ORDER.map((s) => {
        const meta = STATUS_META[s]
        const active = s === value
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? `border-transparent ${meta.soft} ${meta.text}`
                : 'border-edge text-ink-soft hover:bg-ink/[0.05]'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </button>
        )
      })}
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
