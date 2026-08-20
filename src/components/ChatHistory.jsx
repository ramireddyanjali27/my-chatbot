import { useState } from 'react'

export default function ChatHistory({
  groups,
  searchQuery,
  activeChatId,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  onExport,
}) {
  const [menuId, setMenuId] = useState(null)
  const hasGroups = groups.length > 0

  function closeMenu() {
    setMenuId(null)
  }

  if (!hasGroups) {
    return (
      <div className="history-empty">
        {searchQuery.trim() ? (
          <p>No chats found</p>
        ) : (
          <>
            <p>No conversations yet</p>
            <button className="btn-ghost small" onClick={onNewChat}>
              ＋ Start a New Chat
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="history-scroll">
      {groups.map((group) => (
        <section className="history-group" key={group.label}>
          <h3 className="history-label">{group.label.toUpperCase()}</h3>
          {group.chats.map((chat) => (
            <div
              className={`history-item ${chat.id === activeChatId ? 'active' : ''}`}
              key={chat.id}
            >
              <button
                className="history-open"
                onClick={() => onSelect(chat.id)}
                aria-current={chat.id === activeChatId ? 'true' : undefined}
              >
                <span className="history-icon" aria-hidden="true">
                  💬
                </span>
                <span className="history-title">{chat.title}</span>
              </button>
              <div className="menu-wrap">
                <button
                  className="menu-btn"
                  onClick={() => setMenuId((id) => (id === chat.id ? null : chat.id))}
                  aria-label={`Chat actions for ${chat.title}`}
                  aria-expanded={menuId === chat.id}
                >
                  ⋮
                </button>
                {menuId === chat.id && (
                  <>
                    <div className="menu-backdrop" onClick={closeMenu} />
                    <div className="menu" role="menu">
                      <button
                        role="menuitem"
                        onClick={() => {
                          closeMenu()
                          onRename(chat.id)
                        }}
                      >
                        ✏️ Rename
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => {
                          closeMenu()
                          onExport(chat.id)
                        }}
                      >
                        📄 Export Chat
                      </button>
                      <button
                        role="menuitem"
                        className="danger"
                        onClick={() => {
                          closeMenu()
                          onDelete(chat.id)
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}