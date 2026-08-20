import { useMemo, useState } from 'react'
import SearchChats from './SearchChats'
import ChatHistory from './ChatHistory'
import { filterChats, groupChats, sortNewestFirst } from '../lib/helpers'

export default function Sidebar({
  chats,
  activeChatId,
  open,
  collapsed,
  onToggleCollapse,
  onNewChat,
  onSelectChat,
  onRename,
  onDelete,
  onExport,
  onOpenSettings,
}) {
  const [query, setQuery] = useState('')

  const sorted = useMemo(() => sortNewestFirst(chats), [chats])
  const filtered = useMemo(() => filterChats(sorted, query), [sorted, query])
  const groups = useMemo(() => groupChats(filtered), [filtered])

  return (
    <aside className={`sidebar ${open ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <span className="brand-avatar" aria-hidden="true">
            🤖
          </span>
          {!collapsed && <span className="brand-title">MyChatbot</span>}
          <button
            className="icon-btn sidebar-collapse"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <button className="new-chat-btn" onClick={onNewChat}>
          <span aria-hidden="true">＋</span>
          {!collapsed && <span>New Chat</span>}
        </button>

        {!collapsed && <SearchChats value={query} onChange={setQuery} />}

        {!collapsed && (
          <div className="history-section">
            <h3 className="history-heading">CHAT HISTORY</h3>
            <ChatHistory
              groups={groups}
              searchQuery={query}
              activeChatId={activeChatId}
              onSelect={onSelectChat}
              onNewChat={onNewChat}
              onRename={onRename}
              onDelete={onDelete}
              onExport={onExport}
            />
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        {!collapsed && (
          <button className="sidebar-settings" onClick={onOpenSettings}>
            <span aria-hidden="true">⚙️</span>
            Settings
          </button>
        )}
        {collapsed && (
          <button
            className="icon-btn sidebar-settings-icon"
            onClick={onOpenSettings}
            aria-label="Open settings"
          >
            ⚙️
          </button>
        )}
        <div className="user-area">
          <span className="user-avatar" aria-hidden="true">
            👤
          </span>
          {!collapsed && (
            <span className="user-name">
              <strong>Guest User</strong>
            </span>
          )}
        </div>
      </div>
    </aside>
  )
}