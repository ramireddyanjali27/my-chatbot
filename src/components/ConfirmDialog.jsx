import Modal from './Modal'

export default function ConfirmDialog({ message, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  return (
    <Modal title="Confirm" onClose={onCancel}>
      <p className="modal-message">{message}</p>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onCancel}>
          {cancelLabel || 'Cancel'}
        </button>
        <button className="btn-danger" onClick={onConfirm} autoFocus>
          {confirmLabel || 'Confirm'}
        </button>
      </div>
    </Modal>
  )
}