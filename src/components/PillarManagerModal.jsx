import { useState } from 'react'
import { PILLAR_COLORS } from '../constants/index.js'

export default function PillarManagerModal({ pillars, onAdd, onDelete, onClose }) {
  const [name, setName] = useState('')
  const [colorIdx, setColorIdx] = useState(0)

  function add() {
    if (!name.trim()) return
    onAdd(name.trim(), colorIdx)
    setName('')
    setColorIdx(0)
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>Pillars</h3>
        <div className="pillar-manage-list">
          {pillars.map(p => {
            const c = PILLAR_COLORS[p.colorIdx] || PILLAR_COLORS[0]
            return (
              <div key={p.id} className="pillar-manage-row">
                <span className="swatch" style={{ background: c.text }} />
                <span className="grow">{p.name}</span>
                <button className="del-btn" onClick={() => onDelete(p.id)}>×</button>
              </div>
            )
          })}
        </div>
        <input
          className="input"
          placeholder="New pillar name…"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
        />
        <div className="swatch-row">
          {PILLAR_COLORS.map((c, i) => (
            <button
              key={i}
              className={'swatch-btn' + (colorIdx === i ? ' selected' : '')}
              style={{ background: c.text }}
              onClick={() => setColorIdx(i)}
              aria-label={`Color ${i + 1}`}
            />
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={add}>Add pillar</button>
        </div>
      </div>
    </div>
  )
}
