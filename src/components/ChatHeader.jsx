import { useState } from 'react'

export default function ChatHeader({
  title,
  onOpenSidebar,
  onNewChat,
  onRename,
  onExport,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <header className="chat-header">
      <div className="chat-header-left">
        <button
          className="icon-btn mobile-menu-btn"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
        >
          ☰
        </button>
        <div className="chat-brand">
          <span className="brand-avatar" aria-hidden="true">
            🤖
          </span>
          <div className="brand-text">
            <span className="brand-title" title={title}>
              {title}
            </span>
            <span className="brand-status">
              <span className="status-dot" aria-hidden="true" />
              Online
            </span>
          </div>
        </div>
      </div>

      <div className="chat-header-actions">
        <button className="icon-btn" onClick={onNewChat} aria-label="New chat">
          ＋
        </button>
        <div className="menu-wrap">
          <button
            className="icon-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Chat options"
            aria-expanded={menuOpen}
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <div className="menu-backdrop" onClick={closeMenu} />
              <div className="menu" role="menu">
                <button
                  role="menuitem"
                  onClick={() => {
                    closeMenu()
                    onRename()
                  }}
                >
                  ✏️ Rename
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    closeMenu()
                    onExport()
                  }}
                >
                  📄 Export Chat
                </button>
                <button
                  role="menuitem"
                  className="danger"
                  onClick={() => {
                    closeMenu()
                    onDelete()
                  }}
                >
                  🗑️ Delete Chat
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}