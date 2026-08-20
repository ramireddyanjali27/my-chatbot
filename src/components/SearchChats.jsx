export default function SearchChats({ value, onChange }) {
  return (
    <div className="search-chats">
      <span className="search-icon" aria-hidden="true">
        🔍
      </span>
      <input
        type="search"
        className="search-input"
        placeholder="Search chats..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search chats"
      />
    </div>
  )
}