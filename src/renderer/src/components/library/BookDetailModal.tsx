import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Book, BookDraft, BookStatus } from '../../../../shared/types'
import { useBooks } from '../../store/books'
import { Modal } from '../ui/Modal'
import { BookForm } from './BookForm'
import { StatusPicker } from './BookBits'

const today = (): string => new Date().toISOString().slice(0, 10)

export function BookDetailModal({
  book,
  onClose
}: {
  book: Book | null
  onClose: () => void
}): JSX.Element {
  const saveBook = useBooks((s) => s.saveBook)
  const removeBook = useBooks((s) => s.removeBook)
  const [b, setB] = useState<Book | null>(book)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Ao abrir outro livro, reinicia o estado local.
  useEffect(() => {
    setB(book)
    setConfirmDelete(false)
  }, [book])

  async function moveTo(status: BookStatus): Promise<void> {
    if (!b || status === b.status) return
    const patch: Partial<BookDraft> = { status }
    if (status === 'lendo' && !b.started_at) patch.started_at = today()
    if (status === 'lido' && !b.finished_at) patch.finished_at = today()
    setB({ ...b, ...patch } as Book)
    await saveBook(b.id, patch)
  }

  async function handleSave(draft: BookDraft): Promise<void> {
    if (!b) return
    setSaving(true)
    await saveBook(b.id, draft)
    setSaving(false)
    onClose()
  }

  async function handleDelete(): Promise<void> {
    if (!b) return
    await removeBook(b.id)
    onClose()
  }

  return (
    <Modal open={!!book} onClose={onClose} wide title={b?.title ?? ''}>
      {b && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-soft">Prateleira:</span>
              <StatusPicker value={b.status} onChange={moveTo} />
            </div>

            {confirmDelete ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink-soft">Excluir de vez?</span>
                <button
                  onClick={handleDelete}
                  className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
                >
                  Sim
                </button>
                <button onClick={() => setConfirmDelete(false)} className="btn-ghost py-1.5">
                  Não
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-500/10"
              >
                <Trash2 size={15} /> Excluir
              </button>
            )}
          </div>

          <div className="border-t border-edge pt-4">
            <BookForm
              key={`${b.id}-${b.status}`}
              initial={b}
              submitLabel="Salvar alterações"
              busy={saving}
              onSubmit={handleSave}
              onCancel={onClose}
            />
          </div>
        </div>
      )}
    </Modal>
  )
}
