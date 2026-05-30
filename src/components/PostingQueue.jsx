import {
  DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { deriveQueue, reorderQueue } from '../state/contentModel.js'
import { PILLAR_COLORS, VIDEO_COLORS } from '../constants/index.js'

function QueueRow({ entry, index, pillar, onMarkPosted }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.key })
  const chip = VIDEO_COLORS[entry.tagColorIdx] || VIDEO_COLORS[0]
  const pc = pillar ? PILLAR_COLORS[pillar.colorIdx] || PILLAR_COLORS[0] : { bg: '#eee', text: '#555' }
  // Hookless (virtual) entries reuse the video idea as the hook text — don't print it twice.
  const showVideo = entry.videoIdea && entry.hookText !== entry.videoIdea
  return (
    <div
      ref={setNodeRef}
      className={'queue-row' + (isDragging ? ' queue-row--dragging' : '')}
      style={{ transform: CSS.Transform.toString(transform), transition, borderLeftColor: chip }}
    >
      <span className="queue-num">{index + 1}</span>
      <button className="drag-handle" {...attributes} {...listeners} aria-label="Reorder">⠿</button>
      <div className="queue-body">
        <p className="queue-hook">{entry.hookText}</p>
        {(showVideo || pillar) && (
          <div className="queue-meta">
            {showVideo && (
              <span className="queue-video">
                <span className="queue-video-dot" style={{ background: chip }} />
                {entry.videoIdea}
              </span>
            )}
            {pillar && <span className="tag" style={{ background: pc.bg, color: pc.text }}>{pillar.name}</span>}
          </div>
        )}
      </div>
      <label className="queue-posted" title="Mark as posted">
        <input type="checkbox" onChange={() => onMarkPosted(entry)} />
        <span>posted</span>
      </label>
    </div>
  )
}

export default function PostingQueue({ state, onReorder, onMarkPosted }) {
  const entries = deriveQueue(state)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(e) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    onReorder(reorderQueue(entries.map(en => en.key), active.id, over.id))
  }

  if (entries.length === 0) {
    return (
      <div className="empty">
        No edited videos yet. Set a video's status to <b>Edited</b> to queue its hooks.
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={entries.map(e => e.key)} strategy={verticalListSortingStrategy}>
        <div className="queue">
          {entries.map((entry, i) => (
            <QueueRow
              key={entry.key}
              entry={entry}
              index={i}
              pillar={state.pillars.find(p => p.id === entry.pillarId)}
              onMarkPosted={onMarkPosted}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
