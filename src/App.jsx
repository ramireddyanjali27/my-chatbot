import { useEffect, useRef, useState } from 'react'
import { getBotReply } from './api/chat'
import './App.css'

const WELCOME_MESSAGE = {
  role: 'bot',
  text: 'Hi there! I am MyChatbot. How can I help you today?',
}

function App() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isTyping) return

    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    setIsTyping(true)

    try {
      const reply = await getBotReply(text)
      setIsTyping(false)
      setMessages((prev) => [...prev, { role: 'bot', text: reply }])
    } catch {
      setIsTyping(false)
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: 'Sorry, I could not reach the AI service. Please try again in a moment.',
        },
      ])
    }
  }

  return (
    <div className="chat-shell">
      <header className="chat-header">
        <div className="chat-avatar">🤖</div>
        <div>
          <h1>MyChatbot</h1>
          <span className="chat-status">● Online</span>
        </div>
      </header>

      <main className="chat-body">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="bubble">{msg.text}</div>
          </div>
        ))}
        {isTyping && (
          <div className="message bot">
            <div className="bubble typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <form className="chat-input" onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          aria-label="Message"
          autoFocus
        />
        <button type="submit" disabled={!input.trim() || isTyping}>
          Send
        </button>
      </form>
    </div>
  )
}

export default App
