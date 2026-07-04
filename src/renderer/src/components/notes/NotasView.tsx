import { useEffect, useState } from 'react'
import { StickyNote, Quote, Lightbulb, Trash2, Pencil, Check, X, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Note, NoteType } from '../../../../shared/types'
import { useBooks } from '../../store/books'
import { useNotes } from '../../store/notes'

const NOTE_META: Record<NoteType, { label: string; icon: LucideIcon }> = {
  nota: { label: 'Nota', icon: StickyNote },
  trecho: { label: 'Trecho', icon: Quote },
  callout: { label: 'Destaque', icon: Lightbulb }
}
const NOTE_ORDER: NoteType[] = ['nota', 'trecho', 'callout']

function NoteCard({
  note,
  onSave,
  onDelete
}: {
  note: Note
  onSave: (content: string, pageRef: number | null) => void
  onDelete: () => void
}): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(note.content)
  const [pageRef, setPageRef] = useState(note.page_ref != null ? String(note.page_ref) : '')
  const meta = NOTE_META[note.type]
  const Icon = meta.icon

  function save(): void {
    onSave(content.trim() || note.content, pageRef ? parseInt(pageRef, 10) : null)
    setEditing(false)
  }

  const header = (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint">
        <Icon size={13} /> {meta.label}
        {note.page_ref != null && <span>· p. {note.page_ref}</span>}
      </span>
      {!editing && (
        <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => setEditing(true)}
            aria-label="Editar"
            className="rounded p-1 text-ink-faint hover:bg-ink/[0.06] hover:text-ink"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onDelete}
            aria-label="Excluir"
            className="rounded p-1 text-ink-faint hover:bg-red-500/10 hover:text-red-500"
          >
            <Trash2 size={13} />
          </button>
        </span>
      )}
    </div>
  )

  if (editing) {
    return (
      <div className="card p-3.5">
        {header}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="field resize-y"
          autoFocus
        />
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={pageRef}
            onChange={(e) => setPageRef(e.target.value)}
            placeholder="página"
            className="field h-9 w-24 py-1"
          />
          <button onClick={save} className="btn-primary h-9 py-1">
            <Check size={15} /> Salvar
          </button>
          <button onClick={() => setEditing(false)} className="btn-ghost h-9 py-1">
            <X size={15} />
          </button>
        </div>
      </div>
    )
  }

  // Estilo por tipo
  if (note.type === 'trecho') {
    return (
      <div className="group card border-l-[3px] border-l-accent p-3.5">
        {header}
        <p className="whitespace-pre-wrap font-serif text-[15px] italic leading-relaxed text-ink">
          “{note.content}”
        </p>
      </div>
    )
  }
  if (note.type === 'callout') {
    return (
      <div className="group rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5">
        {header}
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{note.content}</p>
      </div>
    )
  }
  return (
    <div className="group card p-3.5">
      {header}
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{note.content}</p>
    </div>
  )
}

export function NotasView(): JSX.Element {
  const books = useBooks((s) => s.books)
  const loadBooks = useBooks((s) => s.load)
  const { bookId, notes, select, add, update, remove } = useNotes()

  const [type, setType] = useState<NoteType>('nota')
  const [content, setContent] = useState('')
  const [page, setPage] = useState('')

  useEffect(() => {
    void loadBooks()
  }, [loadBooks])

  // Seleciona o primeiro livro assim que a lista carrega.
  useEffect(() => {
    if (bookId == null && books.length) void select(books[0].id)
  }, [books, bookId, select])

  async function submit(): Promise<void> {
    if (!content.trim()) return
    await add(type, content, page ? parseInt(page, 10) : null)
    setContent('')
    setPage('')
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-edge py-16 text-center">
        <StickyNote size={28} className="text-ink-faint" />
        <p className="text-sm text-ink-soft">
          Adicione livros à sua biblioteca para começar a registrar notas e trechos.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      {/* Adicionar */}
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">Livro</span>
          <select
            value={bookId ?? ''}
            onChange={(e) => void select(Number(e.target.value))}
            className="field"
          >
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>

        <div className="card space-y-3 p-4">
          <div className="flex gap-1.5">
            {NOTE_ORDER.map((t) => {
              const M = NOTE_META[t]
              const Icon = M.icon
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    type === t
                      ? 'border-transparent bg-accent text-white'
                      : 'border-edge text-ink-soft hover:bg-ink/[0.05]'
                  }`}
                >
                  <Icon size={14} /> {M.label}
                </button>
              )
            })}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder={
              type === 'trecho'
                ? 'Cole a citação do livro…'
                : type === 'callout'
                  ? 'Uma ideia para destacar…'
                  : 'Escreva sua nota…'
            }
            className="field resize-y"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder="página (opcional)"
              className="field h-9 w-40 py-1"
            />
            <button onClick={submit} disabled={!content.trim()} className="btn-primary ml-auto">
              <Plus size={16} /> Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        <h2 className="font-serif text-lg font-semibold text-ink">
          {notes.length > 0 ? `${notes.length} ${notes.length === 1 ? 'anotação' : 'anotações'}` : 'Anotações'}
        </h2>
        {notes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-edge py-10 text-center text-sm text-ink-faint">
            Sem notas para este livro ainda.
          </p>
        ) : (
          notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onSave={(c, p) => void update(n.id, { content: c, page_ref: p })}
              onDelete={() => void remove(n.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
