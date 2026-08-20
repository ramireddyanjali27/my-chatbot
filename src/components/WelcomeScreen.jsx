const PROMPTS = [
  { emoji: '💻', label: 'Explain Java OOP', text: 'Explain Java OOP concepts' },
  { emoji: '⚛️', label: 'Help me with React', text: 'Help me with React' },
  { emoji: '💡', label: 'Give me project ideas', text: 'Give me some project ideas' },
  { emoji: '🌐', label: 'Explain HTML and CSS', text: 'Explain HTML and CSS' },
]

export default function WelcomeScreen({ onPrompt }) {
  return (
    <div className="welcome">
      <div className="welcome-avatar" aria-hidden="true">
        🤖
      </div>
      <h2>Welcome to MyChatbot</h2>
      <p>Your simple and friendly virtual assistant.</p>
      <div className="quick-prompts">
        {PROMPTS.map((p) => (
          <button key={p.text} className="prompt-card" onClick={() => onPrompt(p.text)}>
            <span aria-hidden="true">{p.emoji}</span>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}