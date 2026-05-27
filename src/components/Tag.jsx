import { PILLAR_COLORS, VIDEO_COLORS } from '../constants/index.js'

export function PillarTag({ pillar }) {
  const c = pillar ? PILLAR_COLORS[pillar.colorIdx] || PILLAR_COLORS[0] : { bg: '#eee', text: '#666' }
  return (
    <span className="tag" style={{ background: c.bg, color: c.text }}>
      {pillar ? pillar.name : '—'}
    </span>
  )
}

export function VideoChip({ colorIdx, label }) {
  const color = VIDEO_COLORS[colorIdx] || VIDEO_COLORS[0]
  return (
    <span className="video-chip" title={label} style={{ background: color }}>
      {label}
    </span>
  )
}
