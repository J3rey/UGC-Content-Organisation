import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// Slide-over editor for a video: rename the video at the top, write its script
// below. The script is shared by all of the video's hooks.
export default function ScriptEditor({ video, onChangeTitle, onChangeScript, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="editor-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <aside className="editor-panel" onMouseDown={e => e.stopPropagation()}>
        <div className="editor-head">
          <span className="editor-kicker">Video</span>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <input
          className="editor-title"
          value={video.idea}
          placeholder="Video idea…"
          onChange={e => onChangeTitle(e.target.value)}
        />
        <span className="editor-kicker">Script</span>
        <textarea
          className="editor-script"
          value={video.script}
          placeholder="Write your script…"
          onChange={e => onChangeScript(e.target.value)}
          autoFocus
        />
      </aside>
    </div>,
    document.body
  )
}
