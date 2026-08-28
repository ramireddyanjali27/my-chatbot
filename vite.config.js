import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Reuse the exact same handler that runs on Vercel (api/chat.js) for local dev,
// so local and production use an identical /api/chat flow.
import chatHandler from './api/chat.js'

function readBody(req) {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        resolve({})
      }
    })
  })
}

// Adapt the Vercel-style (req, res) handler contract to the Vite/connect middleware res.
function adaptRes(res) {
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (obj) => {
    const body = JSON.stringify(obj)
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json')
    res.statusCode = res.statusCode || 200
    res.end(body)
    return res
  }
  return res
}

export default defineConfig(({ mode }) => {
  // Load ALL env vars from .env* (including server-side GROQ_API_KEY, not just VITE_*).
  const env = loadEnv(mode, process.cwd(), '')
  process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || env.GROQ_API_KEY
  process.env.GROQ_MODEL = process.env.GROQ_MODEL || env.GROQ_MODEL

  return {
    plugins: [
      react(),
      {
        name: 'local-chat-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.method === 'OPTIONS') {
              res.statusCode = 204
              res.end()
              return
            }
            if (req.method === 'POST' && req.url === '/api/chat') {
              try {
                req.body = await readBody(req)
                await chatHandler(req, adaptRes(res))
              } catch (err) {
                console.error('[dev-api/chat] failed:', err?.message || err)
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Local API error', detail: String(err?.message || err) }))
              }
              return
            }
            next()
          })
        },
      },
    ],
    build: {
      chunkSizeWarningLimit: 700,
    },
  }
})
