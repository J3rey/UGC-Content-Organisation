import { useState } from 'react'

export default function HookList({ video, onOpenHook, onAddHook, onDeleteHook }) {
  const [text, setText] = useState('')

  function add() {
    if (!text.trim()) return
    onAddHook(text.trim())
    setText('')
  }

  return (
    <div className="hook-list">
      {video.hooks.map(h => (
        <div key={h.id} className={'hook-row' + (h.posted ? ' hook-row--posted' : '')}>
          <button className="hook-text" onClick={() => onOpenHook(h.id)}>
            {h.text || <span className="muted">Untitled hook</span>}
          </button>
          {h.posted && <span className="hook-posted-flag">posted</span>}
          <button className="del-btn" onClick={() => onDeleteHook(h.id)}>×</button>
        </div>
      ))}
      <div className="hook-add">
        <input
          className="hook-add-input"
          placeholder="Add a hook…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
        />
        <button className="btn-mini" onClick={add}>+ hook</button>
      </div>
    </div>
  )
}
