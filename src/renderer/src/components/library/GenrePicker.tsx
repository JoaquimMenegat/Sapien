import { useState, type KeyboardEvent } from 'react'
import { X, Plus } from 'lucide-react'

// Gêneros sugeridos (o usuário também pode criar os seus).
const GENRE_SUGGESTIONS = [
  'Romance',
  'Ficção científica',
  'Fantasia',
  'Suspense',
  'Terror',
  'Mistério',
  'Policial',
  'Aventura',
  'Distopia',
  'Clássico',
  'Drama',
  'Poesia',
  'Conto',
  'Crônica',
  'História',
  'Filosofia',
  'Psicologia',
  'Autoajuda',
  'Biografia',
  'Memórias',
  'Negócios',
  'Ciência',
  'Tecnologia',
  'Religião',
  'Espiritualidade',
  'HQ / Graphic Novel',
  'Infantojuvenil',
  'Young Adult',
  'Não-ficção',
  'Ensaios'
]

export function GenrePicker({
  value,
  onChange
}: {
  value: string
  onChange: (v: string) => void
}): JSX.Element {
  const selected = value
    ? value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []
  const [input, setInput] = useState('')

  const has = (g: string): boolean => selected.some((s) => s.toLowerCase() === g.toLowerCase())
  const commit = (list: string[]): void => onChange(list.join(', '))

  function add(g: string): void {
    const t = g.trim()
    if (!t || has(t)) return
    commit([...selected, t])
  }
  function remove(g: string): void {
    commit(selected.filter((s) => s !== g))
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(input)
      setInput('')
    }
  }

  const suggestions = GENRE_SUGGESTIONS.filter((g) => !has(g))

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((g) => (
            <span
              key={g}
              className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent"
            >
              {g}
              <button
                type="button"
                onClick={() => remove(g)}
                aria-label={`Remover ${g}`}
                className="rounded-full hover:text-accent-hover"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Criar um gênero e apertar Enter…"
          className="field pr-9"
        />
        {input.trim() && (
          <button
            type="button"
            onClick={() => {
              add(input)
              setInput('')
            }}
            aria-label="Adicionar gênero"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-faint hover:text-accent"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
          {suggestions.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => add(g)}
              className="rounded-full border border-edge px-2.5 py-1 text-xs text-ink-soft transition-colors hover:bg-ink/[0.05]"
            >
              {g}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
