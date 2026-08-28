// Vercel serverless function: /api/chat
// Keeps the Groq API key server-side (env: GROQ_API_KEY) and proxies requests to Groq.
// The frontend never sees or stores the secret key in production.

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
const REQUEST_TIMEOUT_MS = 15000
// Free/on-demand Groq tiers are capped at 8000 TPM. A 4096-token answer can exhaust
// the entire minute budget in one request. Keep per-answer output bounded so several
// answers fit inside a minute. Version: lower = more answers/minute but shorter replies.
const MAX_OUTPUT_TOKENS = Number(process.env.GROQ_MAX_TOKENS) || 1500
// On 429 (rate limit) retry briefly before failing, honoring Groq's reset time (capped).
const MAX_RETRIES = Number(process.env.GROQ_MAX_RETRIES) || 2
const MAX_RETRY_WAIT_MS = 1500

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function parseRetrySeconds(headers) {
  const reset = headers.get('x-ratelimit-reset-tokens')
  const raw = reset?.replace(/s$/, '')
  const n = Number(raw)
  if (Number.isFinite(n) && n > 0) return n
  const retryAfter = headers.get('retry-after')
  const ra = Number(retryAfter)
  if (Number.isFinite(ra) && ra > 0) return ra
  return 1
}

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

  try {
    const { status, ok, data } = await callGroq(apiKey, messages)

    if (!ok) {
      const reason = data?.error?.message || 'Groq API error'
      const code = data?.error?.code || status
      console.error(`[api/chat] Groq error code=${code} status=${status} msg=${reason}`)
      if (status === 429) {
        console.warn('[api/chat] Rate limit (TPM) hit. Try again after the budget resets (~1 min).')
      }
      res.status(status).json({ error: reason, code, status })
      return
    }

    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      console.error('[api/chat] Empty response from Groq.')
      res.status(502).json({ error: 'Empty response from Groq.', code: 502 })
      return
    }

    res.status(200).json({ reply: content })
  } catch (err) {
    console.error('[api/chat] Failed to reach Groq:', err?.message || err)
    res.status(500).json({ error: 'Failed to reach Groq.', detail: String(err?.message || err), code: 500 })
  }
}

/**
 * Call Groq once, retrying on HTTP 429 (rate limit) up to MAX_RETRIES times.
 * Returns { status, ok, data }. Never logs the API key.
 */
async function callGroq(apiKey, messages) {
  let retry = 0

  while (true) {
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
          max_tokens: MAX_OUTPUT_TOKENS,
        }),
        signal: controller.signal,
      })

      if (groqRes.status === 429 && retry < MAX_RETRIES) {
        retry += 1
        const wait = Math.min(parseRetrySeconds(groqRes.headers) * 1000, MAX_RETRY_WAIT_MS)
        console.warn(`[api/chat] 429 rate limit, retry ${retry}/${MAX_RETRIES} after ${wait}ms`)
        await sleep(wait)
        continue
      }

      const data = await groqRes.json().catch(() => ({}))
      return { status: groqRes.status, ok: groqRes.ok, data }
    } catch (err) {
      if (err?.name === 'AbortError' && retry < MAX_RETRIES) {
        retry += 1
        console.warn(`[api/chat] request timed out, retry ${retry}/${MAX_RETRIES}`)
        await sleep(500)
        continue
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }
}
