import { Children, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { formatMessageTime } from '../lib/helpers'

function copyText(text) {
  const value = String(text)
  try {
    navigator.clipboard.writeText(value)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = value
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

function CodeBlock({ children }) {
  const child = Children.only(children)
  const className = child?.props?.className || ''
  const match = /language-(\w+)/.exec(className)
  const lang = match ? match[1] : 'code'
  const code = String(child?.props?.children || '')
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  function handleCopy() {
    copyText(code)
    setCopied(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="code-block">
      <div className="code-block-bar">
        <span className="code-lang">{lang}</span>
        <button
          className="code-copy-btn"
          onClick={handleCopy}
          aria-label={`Copy ${lang} code`}
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <pre className={className}>{child}</pre>
    </div>
  )
}

const markdownComponents = {
  pre: CodeBlock,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
}

export default function ChatMessage({ message, showTimestamp, isLatest, onRegenerate }) {
  const { sender, text, timestamp } = message
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  function flashCopied() {
    setCopied(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 1500)
  }

  async function handleCopy() {
    copyText(text)
    flashCopied()
  }

  return (
    <div className={`message-row ${sender}`}>
      {sender === 'bot' && (
        <span className="msg-avatar" aria-hidden="true">
          🤖
        </span>
      )}
      <div className="message-main">
        <div className="message-label">{sender === 'bot' ? 'MyChatbot' : 'You'}</div>
        {sender === 'bot' ? (
          <div className="bubble bubble-md">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={markdownComponents}
            >
              {text}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="bubble">{text}</div>
        )}
        <div className="message-footer">
          {showTimestamp && timestamp && (
            <span className="message-time">{formatMessageTime(timestamp)}</span>
          )}
          {sender === 'bot' && (
            <div className="message-actions">
              <button className="action-btn" onClick={handleCopy} aria-label="Copy response">
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
              {isLatest && onRegenerate && (
                <button
                  className="action-btn"
                  onClick={onRegenerate}
                  aria-label="Regenerate response"
                >
                  ↻ Regenerate
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}