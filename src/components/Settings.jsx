import Modal from './Modal'

export default function Settings({ settings, onChange, onClearHistory, onClose }) {
  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="settings">
        <section className="settings-section">
          <h3>Appearance</h3>
          <div className="segmented">
            <button
              className={settings.theme === 'dark' ? 'active' : ''}
              onClick={() => onChange({ theme: 'dark' })}
            >
              🌙 Dark
            </button>
            <button
              className={settings.theme === 'light' ? 'active' : ''}
              onClick={() => onChange({ theme: 'light' })}
            >
              ☀️ Light
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h3>Chat</h3>
          <label className="toggle-row">
            <span>Enter to send</span>
            <input
              type="checkbox"
              checked={settings.enterToSend}
              onChange={(e) => onChange({ enterToSend: e.target.checked })}
            />
          </label>
          <label className="toggle-row">
            <span>Show timestamps</span>
            <input
              type="checkbox"
              checked={settings.showTimestamps}
              onChange={(e) => onChange({ showTimestamps: e.target.checked })}
            />
          </label>
          <label className="toggle-row">
            <span>Save chat history</span>
            <input
              type="checkbox"
              checked={settings.saveHistory}
              onChange={(e) => onChange({ saveHistory: e.target.checked })}
            />
          </label>
        </section>

        <section className="settings-section">
          <h3>Data</h3>
          <button className="btn-danger wide" onClick={onClearHistory}>
            🗑️ Clear All Chats
          </button>
        </section>

        <section className="settings-section">
          <h3>About</h3>
          <p className="settings-about">
            <strong>MyChatbot</strong>
            <br />
            Your simple virtual assistant.
          </p>
        </section>
      </div>
    </Modal>
  )
}