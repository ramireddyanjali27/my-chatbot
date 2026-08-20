export default function TypingIndicator() {
  return (
    <div className="message-row bot" role="status" aria-label="MyChatbot is typing">
      <span className="msg-avatar" aria-hidden="true">
        🤖
      </span>
      <div className="message-main">
        <div className="message-label">MyChatbot is thinking...</div>
        <div className="bubble typing-bubble" aria-hidden="true">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  )
}