import { useEffect, useRef, useState } from 'react'

const MAX_LENGTH = 2000

export default function MessageInput({ onSend, disabled, enterToSend, focusToken }) {
  const [value, setValue] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  useEffect(() => {
    ref.current?.focus()
  }, [focusToken])

  function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
    ref.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && enterToSend) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="input-area">
      <form
        className="input-bar"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <textarea
          ref={ref}
          className="chat-input"
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_LENGTH}
          placeholder="Type a message..."
          aria-label="Type a message"
          autoComplete="off"
        />
        <button
          type="submit"
          className="send-btn"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
      <div className="input-meta">
        <span className="char-counter">
          {value.length} / {MAX_LENGTH}
        </span>
      </div>
    </div>
  )
}