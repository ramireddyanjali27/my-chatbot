export const STORAGE_KEYS = {
  chats: 'mychatbot_chats',
  activeChat: 'mychatbot_active_chat',
  settings: 'mychatbot_settings',
  legacyHistory: 'mychatbot.history',
}

export const WELCOME_MESSAGE = 'Hi there! I am MyChatbot. How can I help you today?'

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  enterToSend: true,
  showTimestamps: true,
  saveHistory: true,
}

export const FALLBACK_REPLY = "I'm still learning. Could you please rephrase your question?"

export function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function makeMessage(sender, text) {
  return {
    id: uid('msg'),
    sender,
    text,
    timestamp: new Date().toISOString(),
  }
}

export function createChat() {
  const now = new Date().toISOString()
  return {
    id: uid('chat'),
    title: 'New Chat',
    createdAt: now,
    updatedAt: now,
    messages: [makeMessage('bot', WELCOME_MESSAGE)],
  }
}

const TITLE_PREFIX = /^(?:explain(?: to me)?|how can i|how do i|how do you|how to|what is|what's|what are|what does|what do you mean by|tell me about|tell me|help me with|help me|define|describe|give me|show me|why is|can you (?:explain|tell|give|show))\s+/i
const TITLE_WANT = /^(?:i want to(?: learn| know| understand)?|i need to|i'd like to|i'm trying to|i am trying to|i want|i need)\s+/i
const TITLE_VERB = /^(?:create|make|build|write|set up|learn|start|use|install|fix|solve|improve|practice|study|understand)\s+/i
const TITLE_LEADING_STOPWORDS = /^(?:a|an|the|to|for|about)\s+/i

export function generateTitle(text) {
  const cleaned = text.trim().replace(/\s+/g, ' ').replace(/[.!?,;:]+$/, '')
  const body = cleaned
    .replace(TITLE_PREFIX, '')
    .replace(TITLE_WANT, '')
    .replace(TITLE_VERB, '')
    .replace(TITLE_LEADING_STOPWORDS, '')
  if (body.trim()) {
    const title = body
      .split(' ')
      .filter(Boolean)
      .slice(0, 5)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    if (title.length > 42) return `${title.slice(0, 42)}…`
    return title
  }
  const fallback = cleaned
    .split(' ')
    .filter(Boolean)
    .slice(0, 5)
    .join(' ')
  const capitalized = fallback.charAt(0).toUpperCase() + fallback.slice(1)
  return capitalized.length > 42 ? `${capitalized.slice(0, 42)}…` : capitalized
}

function sanitizeMessages(messages) {
  return (messages || []).filter(
    (m) =>
      m &&
      (m.sender === 'bot' || m.sender === 'user') &&
      typeof m.text === 'string' &&
      m.text.trim().length > 0,
  )
}

export function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.chats)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const valid = parsed
          .filter((c) => c && typeof c.id === 'string' && Array.isArray(c.messages))
          .map((c) => ({
            id: c.id,
            title:
              typeof c.title === 'string' && c.title.trim() ? c.title.trim() : 'New Chat',
            createdAt: c.createdAt || new Date().toISOString(),
            updatedAt: c.updatedAt || c.createdAt || new Date().toISOString(),
            messages: sanitizeMessages(c.messages),
          }))
        if (valid.length > 0) return valid
      }
    }
  } catch {
    // Corrupted chats — fall through to legacy migration below.
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.legacyHistory)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const msgs = sanitizeMessages(parsed).map((m) => ({
          id: uid('msg'),
          sender: m.sender,
          text: m.text,
          timestamp: m.timestamp || new Date().toISOString(),
        }))
        if (msgs.length > 0) {
          const now = new Date().toISOString()
          return [
            {
              id: uid('chat'),
              title: 'My Chat',
              createdAt: now,
              updatedAt: now,
              messages: msgs,
            },
          ]
        }
      }
    }
  } catch {
    // Ignore legacy storage problems.
  }

  return []
}

export function saveChats(chats) {
  try {
    localStorage.setItem(STORAGE_KEYS.chats, JSON.stringify(chats))
  } catch {
    // Storage unavailable — chat continues to work in memory.
  }
}

export function loadActiveChatId() {
  try {
    return localStorage.getItem(STORAGE_KEYS.activeChat) || null
  } catch {
    return null
  }
}

export function saveActiveChatId(id) {
  try {
    localStorage.setItem(STORAGE_KEYS.activeChat, id || '')
  } catch {
    // Ignore storage failures.
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_SETTINGS, ...parsed }
      }
    }
  } catch {
    // Fall back to defaults.
  }
  return { ...DEFAULT_SETTINGS }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
  } catch {
    // Ignore storage failures.
  }
}

export function groupLabel(updatedAt, now = new Date()) {
  const d = new Date(updatedAt)
  if (Number.isNaN(d.getTime())) return 'Older'
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.floor((startToday - startDay) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days <= 7) return 'Previous 7 Days'
  return 'Older'
}

export function groupChats(chats) {
  const groups = [
    { label: 'Today', chats: [] },
    { label: 'Yesterday', chats: [] },
    { label: 'Previous 7 Days', chats: [] },
    { label: 'Older', chats: [] },
  ]
  for (const chat of chats) {
    const label = groupLabel(chat.updatedAt)
    const group = groups.find((g) => g.label === label)
    if (group) group.chats.push(chat)
  }
  return groups.filter((g) => g.chats.length > 0)
}

export function filterChats(chats, query) {
  const q = query.trim().toLowerCase()
  if (!q) return chats
  return chats.filter((c) => {
    if (c.title.toLowerCase().includes(q)) return true
    return c.messages.some((m) => m.text.toLowerCase().includes(q))
  })
}

export function sortNewestFirst(chats) {
  return [...chats].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
}

export function buildExportText(chat) {
  const lines = ['MyChatbot Conversation', `Title: ${chat.title}`, '']
  for (const m of chat.messages) {
    lines.push(m.sender === 'user' ? 'User:' : 'MyChatbot:')
    lines.push(m.text)
    lines.push('')
  }
  return lines.join('\n')
}

export function exportChatToFile(chat) {
  const text = buildExportText(chat)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(chat.title || 'chat').replace(/[\\/:*?"<>|]/g, '-')}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function formatMessageTime(timestamp) {
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}