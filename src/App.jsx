import { useState, useEffect } from 'react'
import {
  DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useLocalState } from './hooks/useLocalState.js'
import { newVideo, newHook, newPillar, assignVideoColor } from './state/contentModel.js'
import { exportToFile, importFromFile } from './state/storage.js'
import { STATUSES } from './constants/index.js'
import Header from './components/Header.jsx'
import VideoCard from './components/VideoCard.jsx'
import ScriptEditor from './components/ScriptEditor.jsx'
import PostingQueue from './components/PostingQueue.jsx'
import PillarManagerModal from './components/PillarManagerModal.jsx'

function SortableVideoCard(props) {
  const sortable = useSortable({ id: props.video.id })
  return <VideoCard {...props} sortable={sortable} />
}

function AddVideoRow({ pillars, onAdd }) {
  const [idea, setIdea] = useState('')
  const [pillarId, setPillarId] = useState(pillars[0]?.id || '')
  const [status, setStatus] = useState('Idea')

  useEffect(() => {
    if (!pillars.find(p => p.id === pillarId)) setPillarId(pillars[0]?.id || '')
  }, [pillars, pillarId])

  function submit() {
    if (!idea.trim() || !pillarId) return
    onAdd(idea.trim(), pillarId, status)
    setIdea('')
    setStatus('Idea')
  }

  return (
    <div className="add-row">
      <input
        className="input add-idea"
        placeholder="New video idea…"
        value={idea}
        onChange={e => setIdea(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
      />
      <select className="select" value={pillarId} onChange={e => setPillarId(e.target.value)}>
        {pillars.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
        {STATUSES.map(s => <option key={s}>{s}</option>)}
      </select>
      <button className="btn btn-primary" onClick={submit}>add</button>
    </div>
  )
}

export default function App() {
  const [state, setState] = useLocalState()
  const [view, setView] = useState('ideas')
  const [editor, setEditor] = useState(null)      // { videoId, hookId|null } | null
  const [showPillars, setShowPillars] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // video ops
  function updateVideo(id, patch) {
    setState(s => ({ ...s, videos: s.videos.map(v => v.id === id ? { ...v, ...patch } : v) }))
  }
  function deleteVideo(id) {
    setState(s => {
      const video = s.videos.find(v => v.id === id)
      const removedKeys = new Set([id, ...(video?.hooks.map(h => h.id) ?? [])])
      return {
        ...s,
        videos: s.videos.filter(v => v.id !== id),
        postingOrder: s.postingOrder.filter(k => !removedKeys.has(k)),
      }
    })
    if (editor?.videoId === id) setEditor(null)
  }
  function addVideo(idea, pillarId, status) {
    setState(s => ({
      ...s,
      videos: [...s.videos, newVideo({ idea, pillarId, status, tagColorIdx: assignVideoColor(s.videos) })],
    }))
  }
  function reorderVideos(activeId, overId) {
    setState(s => {
      const ids = s.videos.map(v => v.id)
      const from = ids.indexOf(activeId)
      const to = ids.indexOf(overId)
      if (from === -1 || to === -1) return s
      return { ...s, videos: arrayMove(s.videos, from, to) }
    })
  }

  // hook ops
  function addHook(videoId, text) {
    setState(s => ({
      ...s,
      videos: s.videos.map(v => v.id === videoId ? { ...v, hooks: [...v.hooks, newHook(text)] } : v),
    }))
  }
  function updateHook(videoId, hookId, patch) {
    setState(s => ({
      ...s,
      videos: s.videos.map(v => v.id === videoId
        ? { ...v, hooks: v.hooks.map(h => h.id === hookId ? { ...h, ...patch } : h) }
        : v),
    }))
  }
  function deleteHook(videoId, hookId) {
    setState(s => ({
      ...s,
      videos: s.videos.map(v => v.id === videoId ? { ...v, hooks: v.hooks.filter(h => h.id !== hookId) } : v),
      postingOrder: s.postingOrder.filter(k => k !== hookId),
    }))
  }

  // pillar ops
  function addPillar(name, colorIdx) {
    setState(s => ({ ...s, pillars: [...s.pillars, newPillar(name, colorIdx)] }))
  }
  function deletePillar(id) {
    setState(s => ({
      ...s,
      pillars: s.pillars.filter(p => p.id !== id),
      filter: s.filter === id ? 'all' : s.filter,
    }))
  }

  // queue ops
  function setPostingOrder(keys) {
    setState(s => ({ ...s, postingOrder: keys }))
  }
  function markPosted(entry) {
    if (entry.hookId) updateHook(entry.videoId, entry.hookId, { posted: true })
    else updateVideo(entry.videoId, { status: 'Posted' })
  }

  // import/export
  async function handleImport(file) {
    try {
      const data = await importFromFile(file)
      if (!data || !Array.isArray(data.videos) || !Array.isArray(data.pillars)) {
        throw new Error('Not a valid backup file')
      }
      if (confirm('Replace all current data with the imported file?')) setState(data)
    } catch (e) {
      alert(e.message)
    }
  }

  const editorVideo = editor ? state.videos.find(v => v.id === editor.videoId) : null
  const editorHook = editor && editor.hookId ? editorVideo?.hooks.find(h => h.id === editor.hookId) : null

  const visible = state.videos.filter(v => state.filter === 'all' || v.pillarId === state.filter)
  const active = visible.filter(v => v.status !== 'Posted')
  const posted = visible.filter(v => v.status === 'Posted')

  const cardHandlers = {
    onOpenIdea: id => setEditor({ videoId: id, hookId: null }),
    onUpdateVideo: updateVideo,
    onDeleteVideo: deleteVideo,
    onAddHook: addHook,
    onOpenHook: (vid, hid) => setEditor({ videoId: vid, hookId: hid }),
    onDeleteHook: deleteHook,
  }

  return (
    <div className="app">
      <Header
        view={view}
        setView={setView}
        pillars={state.pillars}
        filter={state.filter}
        setFilter={f => setState(s => ({ ...s, filter: f }))}
        onManagePillars={() => setShowPillars(true)}
        onExport={() => exportToFile(state)}
        onImport={handleImport}
      />

      <main className="main">
        {view === 'ideas' ? (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={e => { if (e.over && e.active.id !== e.over.id) reorderVideos(e.active.id, e.over.id) }}
            >
              <SortableContext items={active.map(v => v.id)} strategy={verticalListSortingStrategy}>
                <div className="cards">
                  {active.map(v => (
                    <SortableVideoCard key={v.id} video={v} pillars={state.pillars} {...cardHandlers} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <AddVideoRow pillars={state.pillars} onAdd={addVideo} />

            {posted.length > 0 && (
              <div className="archive">
                <div className="archive-label">Posted</div>
                {posted.map(v => (
                  <VideoCard key={v.id} video={v} pillars={state.pillars} sortable={null} {...cardHandlers} />
                ))}
              </div>
            )}
          </>
        ) : (
          <PostingQueue state={state} onReorder={setPostingOrder} onMarkPosted={markPosted} />
        )}
      </main>

      {editor && editorVideo && (
        <ScriptEditor
          video={editorVideo}
          hook={editorHook}
          onChangeTitle={val => editorHook
            ? updateHook(editor.videoId, editor.hookId, { text: val })
            : updateVideo(editor.videoId, { idea: val })}
          onChangeScript={val => updateVideo(editor.videoId, { script: val })}
          onClose={() => setEditor(null)}
        />
      )}

      {showPillars && (
        <PillarManagerModal
          pillars={state.pillars}
          onAdd={addPillar}
          onDelete={deletePillar}
          onClose={() => setShowPillars(false)}
        />
      )}
    </div>
  )
}
