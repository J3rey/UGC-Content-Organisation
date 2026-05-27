import { useState } from 'react'
import { CSS } from '@dnd-kit/utilities'
import { PILLAR_COLORS, STATUSES, VIDEO_COLORS } from '../constants/index.js'
import HookList from './HookList.jsx'

export default function VideoCard({
  video, pillars, sortable,
  onOpenScript, onUpdateVideo, onDeleteVideo,
  onAddHook, onUpdateHook, onDeleteHook,
}) {
  const [open, setOpen] = useState(false)
  const {
    attributes = {}, listeners = {}, setNodeRef,
    transform, transition, isDragging = false,
  } = sortable || {}

  const pillar = pillars.find(p => p.id === video.pillarId)
  const pc = pillar ? PILLAR_COLORS[pillar.colorIdx] || PILLAR_COLORS[0] : { bg: '#eee', text: '#555' }
  const chip = VIDEO_COLORS[video.tagColorIdx] || VIDEO_COLORS[0]

  return (
    <div
      ref={setNodeRef}
      className={'card' + (isDragging ? ' card--dragging' : '') + (video.status === 'Posted' ? ' card--posted' : '')}
      style={{ transform: CSS.Transform.toString(transform), transition, borderLeftColor: chip }}
    >
      <div className="card-top">
        {sortable && (
          <button className="drag-handle" {...attributes} {...listeners} aria-label="Reorder">⠿</button>
        )}
        <button className="card-title" onClick={() => onOpenScript(video.id)} title="Open script">
          {video.idea || <span className="muted">Untitled</span>}
        </button>
        <select
          className="select pillar-select"
          value={video.pillarId}
          style={{ background: pc.bg, color: pc.text }}
          onChange={e => onUpdateVideo(video.id, { pillarId: e.target.value })}
        >
          {pillars.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          className={'select status-select status-' + video.status.toLowerCase()}
          value={video.status}
          onChange={e => onUpdateVideo(video.id, { status: e.target.value })}
        >
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <button className="del-btn" onClick={() => onDeleteVideo(video.id)}>×</button>
      </div>

      <div className="card-ref">
        <span className="card-ref-label">ref</span>
        <input
          className="card-ref-input"
          placeholder="reference link…"
          value={video.refLink}
          onChange={e => onUpdateVideo(video.id, { refLink: e.target.value })}
        />
        {video.refLink && (
          <a className="ref-open" href={video.refLink} target="_blank" rel="noreferrer" title="Open link">↗</a>
        )}
      </div>

      <button className="card-hooks-toggle" onClick={() => setOpen(o => !o)}>
        {open ? '▾' : '▸'} {video.hooks.length} hook{video.hooks.length === 1 ? '' : 's'}
      </button>
      {open && (
        <HookList
          video={video}
          onUpdateHook={(hookId, patch) => onUpdateHook(video.id, hookId, patch)}
          onAddHook={t => onAddHook(video.id, t)}
          onDeleteHook={hookId => onDeleteHook(video.id, hookId)}
        />
      )}
    </div>
  )
}
