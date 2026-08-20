import { useEffect, useMemo, useRef, useState } from 'react'
import ChatHeader from './ChatHeader'
import ChatMessage from './ChatMessage'
import MessageInput from './MessageInput'
import TypingIndicator from './TypingIndicator'
import WelcomeScreen from './WelcomeScreen'

export default function ChatWindow({
  chat,
  isTyping,
  settings,
  focusToken,
  onOpenSidebar,
  onNewChat,
  onSend,
  onRegenerate,
  onRename,
  onExport,
  onDelete,
}) {
  const messages = useMemo(() => (chat ? chat.messages : []), [chat])

  return (
    <div className="chat-main">
      <ChatHeader
        title={chat ? chat.title : 'MyChatbot'}
        onOpenSidebar={onOpenSidebar}
        onNewChat={onNewChat}
        onRename={chat ? onRename : undefined}
        onExport={chat ? onExport : undefined}
        onDelete={chat ? onDelete : undefined}
      />

      {chat ? (
        <MessageList
          key={chat.id}
          chat={chat}
          messages={messages}
          isTyping={isTyping}
          showTimestamps={settings.showTimestamps}
          onSend={onSend}
          onRegenerate={onRegenerate}
        />
      ) : (
        <main className="chat-body empty-chat" aria-live="polite">
          <WelcomeScreen onPrompt={onSend} />
        </main>
      )}

      <MessageInput
        onSend={onSend}
        disabled={isTyping}
        enterToSend={settings.enterToSend}
        focusToken={focusToken}
      />
    </div>
  )
}

function MessageList({ chat, messages, isTyping, showTimestamps, onSend, onRegenerate }) {
  const bodyRef = useRef(null)
  const stickRef = useRef(true)
  const [atBottom, setAtBottom] = useState(true)

  let lastBotIndex = -1
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].sender === 'bot') {
      lastBotIndex = i
      break
    }
  }

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.id])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    if (nearBottom) {
      stickRef.current = true
      el.scrollTop = el.scrollHeight
    }
  }, [messages, isTyping])

  function handleScroll() {
    const el = bodyRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    stickRef.current = nearBottom
    setAtBottom(nearBottom)
  }

  function jumpToBottom() {
    const el = bodyRef.current
    if (!el) return
    stickRef.current = true
    setAtBottom(true)
    el.scrollTop = el.scrollHeight
  }

  const hasUserMessage = messages.some((m) => m.sender === 'user')

  return (
    <main className="chat-body" ref={bodyRef} onScroll={handleScroll} aria-live="polite">
      {messages.map((m, i) => (
        <ChatMessage
          key={m.id}
          message={m}
          showTimestamp={showTimestamps}
          isLatest={i === lastBotIndex}
          onRegenerate={lastBotIndex === i ? onRegenerate : null}
        />
      ))}
      {isTyping && <TypingIndicator />}
      {!hasUserMessage && <WelcomeScreen onPrompt={onSend} />}
      {!atBottom && (
        <button className="jump-down" onClick={jumpToBottom} aria-label="Jump to latest message">
          ↓ New messages
        </button>
      )}
    </main>
  )
}