const API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'openai/gpt-oss-120b'
const apiKey = import.meta.env.VITE_GROQ_API_KEY
const MAX_CONTEXT_MESSAGES = 12
const REQUEST_TIMEOUT_MS = 20000

const SYSTEM_PROMPT = `You are MyChatbot, a professional, knowledgeable, and friendly AI assistant.

## How to respond
- Answer the user's actual question directly and clearly. Give a short direct answer first, then explain in an organized way.
- Use Markdown formatting to structure answers: headings (## and ###), bullet lists (-), numbered lists (1.), tables when comparing, inline code (\`code\`) and fenced code blocks with a language identifier for any code.
- For programming questions include: a brief explanation, the key concepts, a code example, an explanation of the code, the expected output where useful, common mistakes, and best practices when appropriate.
- For "how to" questions use: requirements, step-by-step instructions, code/commands where necessary, an explanation, common problems, and the final result.
- For comparison questions use a Markdown table (for example with Feature | Option A | Option B).
- For definition questions give: a definition, a simple explanation, key characteristics, an example, and real-world usage.
- Adapt the length to the question: be concise for simple questions, detailed for complex technical ones.
- Avoid generic filler such as "Ask me about...". Do not repeat the same information. Never give one-line generic answers to real questions.
- Explain technical terms in simple language when the user seems to be learning.
- Use the conversation history to understand follow-up questions (for example "what are its advantages?" refers to the previously discussed topic).
- If you do not know the answer, say so honestly instead of guessing.
- Never claim abilities you do not have.`

const FALLBACK_REPLY = "I'm still learning. Could you please rephrase your question?"
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

async function fetchGroqReply(message, history) {
  if (!apiKey) {
    throw new Error('No API key configured')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history,
          { role: 'user', content: message },
        ],
        temperature: 0.6,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Groq API error (${response.status})`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('Empty response from Groq API')
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

  if (!apiKey) {
    // No API configured — never pretend an AI backend exists.
    return FALLBACK_REPLY
  }

  try {
    return await fetchGroqReply(message, buildContext(history))
  } catch {
    // Network failure, timeout, rate limit or invalid response — never crash.
    return ERROR_REPLY
  }
}