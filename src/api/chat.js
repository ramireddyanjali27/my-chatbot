// MyChatbot API client.
// The browser ONLY ever calls the same-origin /api/chat endpoint.
// The actual Groq call and the secret API key live server-side:
//   - Production: Vercel serverless function (api/chat.js)
//   - Local dev:   the same api/chat.js handler served by the Vite dev server
// The frontend never holds or references the secret key.

const API_ENDPOINT = '/api/chat'
const MAX_CONTEXT_MESSAGES = 12
const REQUEST_TIMEOUT_MS = 20000

export const ERROR_REPLY = "Sorry, I couldn't generate a response right now. Please try again."
const WELCOME_TEXT = 'Hi there! I am MyChatbot. How can I help you today?'

const LOCAL_REPLIES = [
  {
    test: (t) => t === 'hello' || t === 'hello!' || t === 'hello there' || t === 'hey',
    reply: 'Hello! 👋 How can I help you today?',
  },
  {
    test: (t) => t === 'hi' || t === 'hi!' || t === 'hiya' || t === 'howdy',
    reply: 'Hi there! How can I assist you?',
  },
  {
    test: (t) => /\b(how are you|how's it going|how are things|how r u|how do you do)\b/.test(t),
    reply: "I'm doing great! Thanks for asking. 😊",
  },
  {
    test: (t) => /\b(what is your name|what's your name|your name|who are you)\b/.test(t),
    reply: "I'm MyChatbot, your virtual assistant.",
  },
  {
    test: (t) => /\b(what can you do|what do you do|capabilities)\b/.test(t),
    reply: 'I can help answer questions, share information, and have a friendly chat. Ask me anything! 🤖',
  },
  {
    test: (t) => /\b(help|support|assist)\b/.test(t),
    reply: "Sure! Ask me anything and I'll try to help.",
  },
  {
    test: (t) => /\b(thank you|thanks|thx|thank)\b/.test(t),
    reply: "You're welcome! 😊 Happy to help anytime.",
  },
  {
    test: (t) => /\b(bye|goodbye|see you|good night|take care)\b/.test(t),
    reply: 'Goodbye! Have a great day! 👋',
  },
]

function getLocalReply(message) {
  const text = message.trim().toLowerCase()
  for (const item of LOCAL_REPLIES) {
    if (item.test(text)) return item.reply
  }
  return null
}

function buildContext(messages) {
  if (!Array.isArray(messages)) return []
  return messages
    .filter((m) => m && (m.sender === 'user' || m.sender === 'bot'))
    .filter((m) => m.text !== WELCOME_TEXT)
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: String(m.text),
    }))
}

function withTimeout() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  return { controller, timer }
}

/**
 * POST the user message + history to the same-origin /api/chat endpoint.
 * Returns the assistant reply text.
 */
async function requestReply(message, history) {
  const { controller, timer } = withTimeout()
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
      signal: controller.signal,
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const code = response.status
      const reason = data?.error || `HTTP ${code}`
      console.error(`[chat] ${API_ENDPOINT} returned ${code}.`, { code, error: reason })
      throw new Error(
        import.meta.env.DEV && data?.code === 'rate_limit_exceeded'
          ? `AI is rate-limited (${code}). Please wait ~1 minute and try again.`
          : `API error (${code})`,
      )
    }

    const content = data?.reply
    if (typeof content !== 'string' || !content.trim()) {
      console.error('[chat] /api/chat returned an empty reply.')
      throw new Error('Empty response from API')
    }
    return content
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Generate a reply for a user message.
 * @param {string} message - the user's message
 * @param {Array} history - prior chat messages ({ sender, text }) used for context
 */
export async function getBotReply(message, history = []) {
  const local = getLocalReply(message)
  if (local) return local

  const ctx = buildContext(history)

  try {
    const reply = await requestReply(message, ctx)
    console.info(`[chat] /api/chat reply OK (${reply.length} chars).`)
    return reply
  } catch (err) {
    console.error('[chat] getBotReply failed:', err?.message || err)
    // In development, show the real reason so errors are surfaced instead of hidden.
    // In production keep a clean, professional message.
    if (import.meta.env.DEV) return `⚠️ ${err?.message || 'Unable to generate a response'}`
    return ERROR_REPLY
  }
}
