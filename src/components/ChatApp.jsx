import { useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from './Sidebar'
import ChatWindow from './ChatWindow'
import Settings from './Settings'
import ConfirmDialog from './ConfirmDialog'
import RenameDialog from './RenameDialog'
import { getBotReply, ERROR_REPLY } from '../api/chat'
import {
  createChat,
  loadChats,
  loadActiveChatId,
  loadSettings,
  saveChats,
  saveActiveChatId,
  saveSettings,
  generateTitle,
  uid,
  makeMessage,
  exportChatToFile,
} from '../lib/helpers'

function initState() {
  let list = loadChats()
  const savedActive = loadActiveChatId()
  if (list.length === 0) list = [createChat()]
  const active = list.some((c) => c.id === savedActive) ? savedActive : list[0].id
  return { list, active }
}

let cachedInit = null
function getInit() {
  if (!cachedInit) cachedInit = initState()
  return cachedInit
}

export default function ChatApp() {
  const [chats, setChats] = useState(() => getInit().list)
  const [activeChatId, setActiveChatId] = useState(() => getInit().active)
  const [settings, setSettings] = useState(loadSettings)
  const [isTyping, setIsTyping] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [focusToken, setFocusToken] = useState(0)
  const pendingRef = useRef(0)

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId],
  )

  useEffect(() => {
    if (settings.saveHistory) saveChats(chats)
  }, [chats, settings.saveHistory])

  useEffect(() => {
    saveActiveChatId(activeChatId)
  }, [activeChatId])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  function bumpFocus() {
    setFocusToken((t) => t + 1)
  }

  function newChat() {
    const chat = createChat()
    setChats((prev) => [chat, ...prev])
    setActiveChatId(chat.id)
    setSidebarOpen(false)
    bumpFocus()
  }

  function selectChat(id) {
    setActiveChatId(id)
    setSidebarOpen(false)
    bumpFocus()
  }

  function updateChat(chatId, updater) {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? updater(c) : c)),
    )
  }

  function appendMessage(chatId, message) {
    const now = new Date().toISOString()
    updateChat(chatId, (c) => ({
      ...c,
      messages: [...c.messages, message],
      updatedAt: now,
    }))
  }

  async function sendMessage(text) {
    const trimmed = (text ?? '').trim()
    if (!trimmed || pendingRef.current > 0 || !activeChat) return
    const chatId = activeChat.id
    const isNew = activeChat.title === 'New Chat'
    const now = new Date().toISOString()
    const history = activeChat.messages

    updateChat(chatId, (c) => ({
      ...c,
      title: isNew ? generateTitle(trimmed) : c.title,
      messages: [...c.messages, makeMessage('user', trimmed)],
      updatedAt: now,
    }))

    pendingRef.current += 1
    setIsTyping(true)

    try {
      const reply = await getBotReply(trimmed, history)
      appendMessage(chatId, makeMessage('bot', reply))
    } catch {
      appendMessage(chatId, makeMessage('bot', ERROR_REPLY))
    } finally {
      pendingRef.current -= 1
      setIsTyping(false)
    }
  }

  async function regenerate() {
    if (!activeChat || pendingRef.current > 0) return
    const chatId = activeChat.id
    const msgs = activeChat.messages
    let lastUserIdx = -1
    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      if (msgs[i].sender === 'user') {
        lastUserIdx = i
        break
      }
    }
    if (lastUserIdx === -1) return
    const lastUser = msgs[lastUserIdx]
    const history = msgs.slice(0, lastUserIdx)

    setIsTyping(true)
    pendingRef.current += 1

    const now = new Date().toISOString()
    updateChat(chatId, (c) => {
      const next = [...c.messages]
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i].sender === 'bot') {
          next[i] = { id: uid('msg'), sender: 'bot', text: '', timestamp: now }
          break
        }
      }
      return { ...c, messages: next, updatedAt: now }
    })

    try {
      const reply = await getBotReply(lastUser.text, history)
      replaceLastBotMessage(chatId, reply, now)
    } catch {
      replaceLastBotMessage(chatId, ERROR_REPLY, now)
    } finally {
      pendingRef.current -= 1
      setIsTyping(false)
    }
  }

  function replaceLastBotMessage(chatId, text, timestamp) {
    updateChat(chatId, (c) => {
      const next = [...c.messages]
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i].sender === 'bot') {
          next[i] = { ...next[i], text, timestamp: timestamp || new Date().toISOString() }
          break
        }
      }
      return { ...c, messages: next }
    })
  }

  function renameChat(chatId, title) {
    const trimmed = (title ?? '').trim()
    if (!trimmed) return
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title: trimmed } : c)),
    )
    setRenameTarget(null)
  }

  function deleteChat(chatId) {
    setConfirm(null)
    setRenameTarget(null)
    const remaining = chats.filter((c) => c.id !== chatId)
    if (remaining.length === 0) {
      const fresh = createChat()
      setChats([fresh])
      setActiveChatId(fresh.id)
      bumpFocus()
      return
    }
    setChats(remaining)
    if (chatId === activeChatId) {
      setActiveChatId(remaining[0].id)
      bumpFocus()
    }
  }

  function clearAllChats() {
    setConfirm(null)
    setSettingsOpen(false)
    const fresh = createChat()
    setChats([fresh])
    setActiveChatId(fresh.id)
    bumpFocus()
  }

  function handleExport(chatId) {
    const chat = chats.find((c) => c.id === chatId)
    if (chat) exportChatToFile(chat)
  }

  function handleExportActive() {
    if (activeChat) exportChatToFile(activeChat)
  }

  function updateSettings(patch) {
    setSettings((prev) => ({ ...prev, ...patch }))
  }

  const sidebar = (
    <Sidebar
      chats={chats}
      activeChatId={activeChatId}
      open={sidebarOpen}
      collapsed={sidebarCollapsed}
      onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      onNewChat={newChat}
      onSelectChat={selectChat}
      onRename={(id) => {
        const chat = chats.find((c) => c.id === id)
        if (chat) setRenameTarget({ id: chat.id, title: chat.title })
      }}
      onDelete={(id) => setConfirm({ action: 'delete', chatId: id })}
      onExport={handleExport}
      onOpenSettings={() => setSettingsOpen(true)}
    />
  )

  return (
    <div className="chat-app">
      {sidebar}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <ChatWindow
        chat={activeChat}
        isTyping={isTyping}
        settings={settings}
        focusToken={focusToken}
        onOpenSidebar={() => setSidebarOpen(true)}
        onNewChat={newChat}
        onSend={sendMessage}
        onRegenerate={regenerate}
        onRename={() => {
          if (activeChat) setRenameTarget({ id: activeChat.id, title: activeChat.title })
        }}
        onExport={handleExportActive}
        onDelete={() => {
          if (activeChat) setConfirm({ action: 'delete', chatId: activeChat.id })
        }}
      />

      {settingsOpen && (
        <Settings
          settings={settings}
          onChange={updateSettings}
          onClearHistory={() => setConfirm({ action: 'clear' })}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {renameTarget && (
        <RenameDialog
          initialTitle={renameTarget.title}
          onSave={(title) => renameChat(renameTarget.id, title)}
          onCancel={() => setRenameTarget(null)}
        />
      )}

      {confirm && confirm.action === 'delete' && (
        <ConfirmDialog
          message="Delete this chat?"
          confirmLabel="Delete"
          onConfirm={() => deleteChat(confirm.chatId)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm && confirm.action === 'clear' && (
        <ConfirmDialog
          message="Are you sure you want to delete all chat history?"
          confirmLabel="Clear History"
          onConfirm={clearAllChats}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}