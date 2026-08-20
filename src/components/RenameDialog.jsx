import { useState } from 'react'
import Modal from './Modal'

export default function RenameDialog({ initialTitle, onSave, onCancel }) {
  const [value, setValue] = useState(initialTitle || '')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSave(trimmed)
  }

  return (
    <Modal title="Rename chat" onClose={onCancel}>
      <form onSubmit={handleSubmit}>
        <input
          className="modal-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={60}
          autoFocus
          aria-label="Chat title"
        />
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!value.trim()}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}