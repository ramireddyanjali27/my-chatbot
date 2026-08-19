const API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'openai/gpt-oss-120b'
const apiKey = import.meta.env.VITE_GROQ_API_KEY

const SYSTEM_PROMPT = `You are MyChatbot, a friendly and helpful assistant. Answer questions clearly and concisely. If you don't know the answer, say so honestly.`

export async function getBotReply(message) {
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
        { role: 'user', content: message },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Groq API error (${response.status}): ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}