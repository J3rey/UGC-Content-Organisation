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
  return (
    <div
      ref={setNodeRef}
      className={'queue-row' + (isDragging ? ' queue-row--dragging' : '')}
      style={{ transform: CSS.Transform.toString(transform), transition, borderLeftColor: chip }}
    >
      <span className="queue-num">{index + 1}</span>
      <button className="drag-handle" {...attributes} {...listeners} aria-label="Reorder">⠿</button>
      <span className="video-chip" style={{ background: chip }}>{entry.videoIdea}</span>
      <span className="queue-hook">{entry.hookText}</span>
      <span className="tag" style={{ background: pc.bg, color: pc.text }}>{pillar ? pillar.name : '—'}</span>
      <label className="queue-posted">
        <input type="checkbox" onChange={() => onMarkPosted(entry)} /> posted
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
