// Vercel serverless function: /api/chat
// Keeps the Groq API key server-side (env: GROQ_API_KEY) and proxies requests to Groq.
// The frontend never sees or stores the secret key in production.

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
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

function setCors(res, origin) {
  // Same-origin on Vercel (no CORS needed), but allow local dev cross-origin and same-site mirrors.
  const allowed = 'https://social-media-platform-lyart-six.vercel.app'
  const safeOrigin =
    origin && (origin === allowed || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))
      ? origin
      : allowed
  res.setHeader('Access-Control-Allow-Origin', safeOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')
}

export default async function handler(req, res) {
  setCors(res, req.headers.origin)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error('[api/chat] GROQ_API_KEY environment variable is not set on the server.')
    res.status(500).json({ error: 'Server is missing the GROQ_API_KEY environment variable.' })
    return
  }

  const { message, history } = req.body || {}
  if (typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'A message is required.' })
    return
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(Array.isArray(history) ? history : []),
    { role: 'user', content: message },
  ]

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    })

    const data = await groqRes.json().catch(() => ({}))

    if (!groqRes.ok) {
      console.error(`[api/chat] Groq error ${groqRes.status}:`, data?.error?.message || JSON.stringify(data))
      res.status(groqRes.status).json({ error: data?.error?.message || 'Groq API error', code: groqRes.status })
      return
    }

    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      console.error('[api/chat] Empty response from Groq.')
      res.status(502).json({ error: 'Empty response from Groq.' })
      return
    }

    res.status(200).json({ reply: content })
  } catch (err) {
    console.error('[api/chat] Failed to reach Groq:', err?.message || err)
    res.status(500).json({ error: 'Failed to reach Groq.', detail: String(err?.message || err) })
  } finally {
    clearTimeout(timer)
  }
}
