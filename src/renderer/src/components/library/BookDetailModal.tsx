import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Book, BookDraft } from '../../../../shared/types'
import { useBooks } from '../../store/books'
import { Modal } from '../ui/Modal'
import { BookForm } from './BookForm'

export function BookDetailModal({
  book,
  onClose
}: {
  book: Book | null
  onClose: () => void
}): JSX.Element {
  const saveBook = useBooks((s) => s.saveBook)
  const removeBook = useBooks((s) => s.removeBook)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave(draft: BookDraft): Promise<void> {
    if (!book) return
    setSaving(true)
    await saveBook(book.id, draft)
    setSaving(false)
    onClose()
  }

  async function handleDelete(): Promise<void> {
    if (!book) return
    await removeBook(book.id)
    onClose()
  }

  return (
    <Modal open={!!book} onClose={onClose} wide title={book?.title ?? ''}>
      {book && (
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            {confirmDelete ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink-soft">Excluir de vez?</span>
                <button
                  onClick={handleDelete}
                  className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
                >
                  Sim, excluir
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

          <BookForm
            initial={book}
            submitLabel="Salvar alterações"
            busy={saving}
            onSubmit={handleSave}
            onCancel={onClose}
          />
        </div>
      )}
    </Modal>
  )
}
