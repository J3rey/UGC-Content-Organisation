# Content Creation Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, fully-local Content Creation dashboard (no Supabase/server) with reference links, per-video hooks, a global posting queue, a shared script notepad, and a playful neo-brutalist look.

**Architecture:** Single-page Vite + React app. One state object (`{ pillars, videos, postingOrder, filter }`) owned by `App.jsx` via a `useLocalState` hook that auto-persists to `localStorage`. Pure state/queue helpers live in a framework-free `contentModel.js` (unit-tested with Vitest). UI is split into focused components; drag-reorder uses `@dnd-kit`.

**Tech Stack:** Vite, React 18, @dnd-kit (core/sortable/utilities), Vitest. No backend.

Spec: `docs/superpowers/specs/2026-05-27-content-dashboard-design.md`

---

## File Structure

```
package.json              # deps + scripts (dev/build/preview/test)
vite.config.js            # Vite + Vitest config
index.html                # mount point
src/
  main.jsx                # React root
  App.jsx                 # state owner; Ideas/Queue views; wires all ops
  constants/index.js      # PILLAR_COLORS, VIDEO_COLORS, STATUSES
  state/
    contentModel.js       # pure helpers: uid, factories, deriveQueue, reorderQueue, assignVideoColor
    seed.js               # first-run sample data
    storage.js            # localStorage load/save + JSON export/import
  hooks/useLocalState.js  # state + persistence
  components/
    Header.jsx            # brand, Ideas/Queue toggle, filter chips, pillars/export/import
    VideoCard.jsx         # idea (opens script), pillar, status, ref link, hooks, color bar
    HookList.jsx          # hook rows (click opens script) + add hook
    ScriptEditor.jsx      # slide-over notepad bound to a video's shared script
    PostingQueue.jsx      # global drag-reorderable queue of edited hooks
    PillarManagerModal.jsx# add/delete pillars with colors
    Tag.jsx               # PillarTag + VideoChip primitives
  index.css               # neo-brutalist styles
  test/contentModel.test.js
```

---

## Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/index.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "content-dashboard",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.js'],
  },
})
```

- [ ] **Step 3: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Content Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 5: Create minimal `src/index.css` (full styling comes in Task 15)**

```css
:root { color-scheme: light; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { font-family: system-ui, sans-serif; background: #fdf6e3; color: #1a1a1a; }
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: completes, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 7: Verify Vitest runs (no tests yet is OK)**

Run: `npm test`
Expected: Vitest reports "No test files found" (exit non-zero is acceptable here) — confirms vitest is installed and configured. A temporary green check is not required.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html src/main.jsx src/index.css
git commit -m "chore: scaffold Vite + React + Vitest project"
```

---

## Task 2: Constants

**Files:**
- Create: `src/constants/index.js`

- [ ] **Step 1: Create `src/constants/index.js`**

```js
export const STATUSES = ['Idea', 'Scripted', 'Filmed', 'Edited', 'Posted']

// Soft pastel pairs for pillar tags: { bg, text }
export const PILLAR_COLORS = [
  { bg: '#ffd6e8', text: '#9b2c5e' },
  { bg: '#cfe8ff', text: '#1b4f7a' },
  { bg: '#ffe0c2', text: '#9c4a12' },
  { bg: '#fff3bf', text: '#8a6d0b' },
  { bg: '#e6d6ff', text: '#5b3a9b' },
  { bg: '#c7f0e0', text: '#11705a' },
  { bg: '#d6f5c2', text: '#3a7a1e' },
  { bg: '#ffcfcf', text: '#9b2c2c' },
]

// Vivid solid colors for per-video identity chips (the "same video" marker).
// Deliberately distinct from PILLAR_COLORS.
export const VIDEO_COLORS = [
  '#ff5470',
  '#3a86ff',
  '#fb8500',
  '#8338ec',
  '#06d6a0',
  '#ffbe0b',
  '#ef476f',
  '#118ab2',
]
```

- [ ] **Step 2: Commit**

```bash
git add src/constants/index.js
git commit -m "feat: add color palettes and status constants"
```

---

## Task 3: Pure content model (TDD)

**Files:**
- Create: `src/state/contentModel.js`
- Test: `src/test/contentModel.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/test/contentModel.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  uid, newPillar, newHook, newVideo, assignVideoColor, deriveQueue, reorderQueue,
} from '../state/contentModel.js'
import { VIDEO_COLORS } from '../constants/index.js'

describe('factories', () => {
  it('uid returns unique strings', () => {
    expect(uid()).not.toBe(uid())
    expect(typeof uid()).toBe('string')
  })

  it('newPillar trims name and keeps colorIdx', () => {
    const p = newPillar('  Vlog ', 3)
    expect(p.name).toBe('Vlog')
    expect(p.colorIdx).toBe(3)
    expect(p.id).toBeTruthy()
  })

  it('newHook defaults to not posted', () => {
    const h = newHook('hook line')
    expect(h).toMatchObject({ text: 'hook line', posted: false })
    expect(h.id).toBeTruthy()
  })

  it('newVideo builds the full shape with defaults', () => {
    const v = newVideo({ idea: ' My Idea ', pillarId: 'p1', status: 'Idea', tagColorIdx: 2 })
    expect(v).toMatchObject({
      idea: 'My Idea', pillarId: 'p1', status: 'Idea',
      refLink: '', script: '', tagColorIdx: 2, hooks: [],
    })
    expect(v.id).toBeTruthy()
  })
})

describe('assignVideoColor', () => {
  it('cycles through VIDEO_COLORS by count', () => {
    expect(assignVideoColor([])).toBe(0)
    expect(assignVideoColor([{}, {}])).toBe(2)
    expect(assignVideoColor(new Array(VIDEO_COLORS.length).fill({}))).toBe(0)
  })
})

describe('deriveQueue', () => {
  const base = {
    pillars: [{ id: 'p1', name: 'A', colorIdx: 0 }],
    videos: [
      { id: 'v1', idea: 'Vid1', pillarId: 'p1', status: 'Edited', tagColorIdx: 0,
        hooks: [{ id: 'h1', text: 'hookA', posted: false }, { id: 'h2', text: 'hookB', posted: true }] },
      { id: 'v2', idea: 'Vid2', pillarId: 'p1', status: 'Idea', tagColorIdx: 1, hooks: [] },
      { id: 'v3', idea: 'Vid3', pillarId: 'p1', status: 'Edited', tagColorIdx: 2, hooks: [] },
    ],
    postingOrder: [],
    filter: 'all',
  }

  it('includes only unposted hooks of Edited videos', () => {
    const q = deriveQueue(base)
    const keys = q.map(e => e.key)
    expect(keys).toContain('h1')      // edited, unposted
    expect(keys).not.toContain('h2')  // posted -> excluded
    expect(keys).not.toContain('v2')  // not edited -> excluded
  })

  it('adds a virtual entry for an Edited video with no hooks', () => {
    const q = deriveQueue(base)
    const virtual = q.find(e => e.key === 'v3')
    expect(virtual).toBeTruthy()
    expect(virtual.hookId).toBeNull()
    expect(virtual.hookText).toBe('Vid3') // falls back to the idea
  })

  it('orders entries by postingOrder, appending unknown keys', () => {
    const q = deriveQueue({ ...base, postingOrder: ['v3', 'h1'] })
    expect(q.map(e => e.key)).toEqual(['v3', 'h1'])
  })

  it('exposes videoIdea, hookText, pillarId, tagColorIdx per entry', () => {
    const e = deriveQueue(base).find(x => x.key === 'h1')
    expect(e).toMatchObject({ videoId: 'v1', hookId: 'h1', videoIdea: 'Vid1', hookText: 'hookA', pillarId: 'p1', tagColorIdx: 0 })
  })
})

describe('reorderQueue', () => {
  it('moves a key to the target position', () => {
    expect(reorderQueue(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a'])
    expect(reorderQueue(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b'])
  })
  it('returns input unchanged when a key is missing', () => {
    expect(reorderQueue(['a', 'b'], 'x', 'a')).toEqual(['a', 'b'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot import from `../state/contentModel.js` (file does not exist).

- [ ] **Step 3: Implement `src/state/contentModel.js`**

```js
import { VIDEO_COLORS } from '../constants/index.js'

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function newPillar(name, colorIdx) {
  return { id: uid(), name: String(name).trim(), colorIdx }
}

export function newHook(text = '') {
  return { id: uid(), text: String(text), posted: false }
}

export function newVideo({ idea, pillarId, status = 'Idea', tagColorIdx = 0 }) {
  return {
    id: uid(),
    idea: String(idea).trim(),
    pillarId,
    status,
    refLink: '',
    script: '',
    tagColorIdx,
    hooks: [],
  }
}

export function assignVideoColor(videos) {
  return videos.length % VIDEO_COLORS.length
}

function makeEntry(video, hook) {
  return {
    key: hook ? hook.id : video.id,
    videoId: video.id,
    hookId: hook ? hook.id : null,
    videoIdea: video.idea,
    hookText: hook ? hook.text : video.idea,
    pillarId: video.pillarId,
    tagColorIdx: video.tagColorIdx,
  }
}

// Build the ordered posting-queue entries from state.
// Includes unposted hooks of Edited videos; a hookless Edited video yields one
// virtual entry keyed by the video id. Ordered by state.postingOrder; entries
// not present there are appended in natural (video/hook) order.
export function deriveQueue(state) {
  const entries = []
  for (const v of state.videos) {
    if (v.status !== 'Edited') continue
    if (!v.hooks || v.hooks.length === 0) {
      entries.push(makeEntry(v, null))
    } else {
      for (const h of v.hooks) {
        if (!h.posted) entries.push(makeEntry(v, h))
      }
    }
  }
  const order = state.postingOrder || []
  const pos = new Map(order.map((k, i) => [k, i]))
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const ai = pos.has(a.e.key) ? pos.get(a.e.key) : Infinity
      const bi = pos.has(b.e.key) ? pos.get(b.e.key) : Infinity
      if (ai !== bi) return ai - bi
      return a.i - b.i
    })
    .map(({ e }) => e)
}

// Move `fromKey` to the index of `toKey`, returning a new key array.
export function reorderQueue(keys, fromKey, toKey) {
  const arr = [...keys]
  const from = arr.indexOf(fromKey)
  const to = arr.indexOf(toKey)
  if (from === -1 || to === -1) return arr
  arr.splice(to, 0, arr.splice(from, 1)[0])
  return arr
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/state/contentModel.js src/test/contentModel.test.js
git commit -m "feat: add unit-tested content model helpers"
```

---

## Task 4: Seed data

**Files:**
- Create: `src/state/seed.js`

- [ ] **Step 1: Create `src/state/seed.js`**

```js
import { uid } from './contentModel.js'

// First-run sample data. Two Edited videos with multiple hooks demonstrate the
// posting queue and the same-video color chips.
export function seed() {
  const pillars = [
    { id: 'p1', name: 'DITL', colorIdx: 4 },
    { id: 'p2', name: 'Thoughts', colorIdx: 2 },
    { id: 'p3', name: 'Vlog', colorIdx: 5 },
    { id: 'p4', name: 'Story', colorIdx: 0 },
    { id: 'p5', name: 'Talking Head', colorIdx: 1 },
  ]
  const videos = [
    {
      id: uid(), idea: 'DITL3', pillarId: 'p1', status: 'Edited',
      refLink: '', script: '', tagColorIdx: 0,
      hooks: [
        { id: uid(), text: 'my honest 5am routine', posted: false },
        { id: uid(), text: 'nobody talks about this', posted: false },
      ],
    },
    {
      id: uid(), idea: 'no 20k', pillarId: 'p4', status: 'Edited',
      refLink: '', script: '', tagColorIdx: 1,
      hooks: [
        { id: uid(), text: 'I quit my job at 25', posted: false },
        { id: uid(), text: '$0 in savings', posted: false },
      ],
    },
    { id: uid(), idea: 'KASA intro', pillarId: 'p3', status: 'Idea', refLink: '', script: '', tagColorIdx: 2, hooks: [] },
    { id: uid(), idea: 'life comes in waves', pillarId: 'p4', status: 'Scripted', refLink: '', script: '', tagColorIdx: 3, hooks: [] },
    { id: uid(), idea: 'Cleaning Desk', pillarId: 'p1', status: 'Posted', refLink: '', script: '', tagColorIdx: 4, hooks: [] },
  ]
  return { pillars, videos, postingOrder: [], filter: 'all' }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/state/seed.js
git commit -m "feat: add first-run seed data"
```

---

## Task 5: Storage (localStorage + export/import)

**Files:**
- Create: `src/state/storage.js`

- [ ] **Step 1: Create `src/state/storage.js`**

```js
const KEY = 'content-dashboard-v1'

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // ignore quota / serialization errors for a personal local app
  }
}

export function exportToFile(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `content-dashboard-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function importFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result))
      } catch {
        reject(new Error('Invalid JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsText(file)
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/state/storage.js
git commit -m "feat: add localStorage persistence and JSON export/import"
```

---

## Task 6: useLocalState hook

**Files:**
- Create: `src/hooks/useLocalState.js`

- [ ] **Step 1: Create `src/hooks/useLocalState.js`**

```js
import { useState, useEffect } from 'react'
import { load, save } from '../state/storage.js'
import { seed } from '../state/seed.js'

export function useLocalState() {
  const [state, setState] = useState(() => load() || seed())

  useEffect(() => {
    save(state)
  }, [state])

  return [state, setState]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useLocalState.js
git commit -m "feat: add useLocalState persistence hook"
```

---

## Task 7: Tag primitives

**Files:**
- Create: `src/components/Tag.jsx`

- [ ] **Step 1: Create `src/components/Tag.jsx`**

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Tag.jsx
git commit -m "feat: add PillarTag and VideoChip primitives"
```

---

## Task 8: ScriptEditor (shared notepad)

**Files:**
- Create: `src/components/ScriptEditor.jsx`

- [ ] **Step 1: Create `src/components/ScriptEditor.jsx`**

```jsx
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// Slide-over editor. The notepad is ALWAYS bound to the parent video's single
// `script`. When opened from a hook, the top field edits that hook's text; when
// opened from the idea, it edits the video's idea.
export default function ScriptEditor({ video, hook, onChangeTitle, onChangeScript, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const titleValue = hook ? hook.text : video.idea
  const kicker = hook ? 'Hook' : 'Idea'

  return createPortal(
    <div className="editor-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <aside className="editor-panel" onMouseDown={e => e.stopPropagation()}>
        <div className="editor-head">
          <span className="editor-kicker">{kicker}</span>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <input
          className="editor-title"
          value={titleValue}
          placeholder={hook ? 'Hook line…' : 'Video idea…'}
          onChange={e => onChangeTitle(e.target.value)}
        />
        <span className="editor-kicker">Script {hook ? '(shared by all hooks)' : ''}</span>
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ScriptEditor.jsx
git commit -m "feat: add ScriptEditor slide-over notepad"
```

---

## Task 9: HookList

**Files:**
- Create: `src/components/HookList.jsx`

- [ ] **Step 1: Create `src/components/HookList.jsx`**

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/HookList.jsx
git commit -m "feat: add HookList component"
```

---

## Task 10: VideoCard

**Files:**
- Create: `src/components/VideoCard.jsx`

- [ ] **Step 1: Create `src/components/VideoCard.jsx`**

```jsx
import { useState } from 'react'
import { CSS } from '@dnd-kit/utilities'
import { PILLAR_COLORS, STATUSES, VIDEO_COLORS } from '../constants/index.js'
import HookList from './HookList.jsx'

export default function VideoCard({
  video, pillars, sortable,
  onOpenIdea, onUpdateVideo, onDeleteVideo,
  onAddHook, onOpenHook, onDeleteHook,
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
        <button className="card-title" onClick={() => onOpenIdea(video.id)}>
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
          onOpenHook={hookId => onOpenHook(video.id, hookId)}
          onAddHook={t => onAddHook(video.id, t)}
          onDeleteHook={hookId => onDeleteHook(video.id, hookId)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/VideoCard.jsx
git commit -m "feat: add VideoCard component"
```

---

## Task 11: PillarManagerModal

**Files:**
- Create: `src/components/PillarManagerModal.jsx`

- [ ] **Step 1: Create `src/components/PillarManagerModal.jsx`**

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PillarManagerModal.jsx
git commit -m "feat: add PillarManagerModal component"
```

---

## Task 12: PostingQueue

**Files:**
- Create: `src/components/PostingQueue.jsx`

- [ ] **Step 1: Create `src/components/PostingQueue.jsx`**

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PostingQueue.jsx
git commit -m "feat: add global PostingQueue component"
```

---

## Task 13: Header

**Files:**
- Create: `src/components/Header.jsx`

- [ ] **Step 1: Create `src/components/Header.jsx`**

```jsx
import { PILLAR_COLORS } from '../constants/index.js'

export default function Header({
  view, setView, pillars, filter, setFilter,
  onManagePillars, onExport, onImport,
}) {
  return (
    <header className="app-header">
      <div className="brand">CONTENT</div>

      <div className="view-toggle">
        <button className={'toggle-btn' + (view === 'ideas' ? ' active' : '')} onClick={() => setView('ideas')}>ideas</button>
        <button className={'toggle-btn' + (view === 'queue' ? ' active' : '')} onClick={() => setView('queue')}>queue</button>
      </div>

      {view === 'ideas' && (
        <div className="filters">
          <button className={'chip' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>all</button>
          {pillars.map(p => {
            const c = PILLAR_COLORS[p.colorIdx] || PILLAR_COLORS[0]
            return (
              <button
                key={p.id}
                className={'chip' + (filter === p.id ? ' active' : '')}
                style={{ background: c.bg, color: c.text }}
                onClick={() => setFilter(p.id)}
              >
                {p.name}
              </button>
            )
          })}
        </div>
      )}

      <div className="header-actions">
        <button className="btn" onClick={onManagePillars}>pillars</button>
        <button className="btn" onClick={onExport}>export</button>
        <label className="btn file-btn">
          import
          <input
            type="file"
            accept="application/json"
            onChange={e => { if (e.target.files[0]) onImport(e.target.files[0]); e.target.value = '' }}
          />
        </label>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Header.jsx
git commit -m "feat: add Header with view toggle, filters, and IO actions"
```

---

## Task 14: App (wire everything together)

**Files:**
- Create: `src/App.jsx`

- [ ] **Step 1: Create `src/App.jsx`**

```jsx
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
    setState(s => ({ ...s, videos: s.videos.filter(v => v.id !== id) }))
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
```

- [ ] **Step 2: Run the unit tests (ensure nothing broke)**

Run: `npm test`
Expected: PASS — contentModel tests still green.

- [ ] **Step 3: Start the dev server and verify the app loads**

Run: `npm run dev`
Then open the shown URL (default http://localhost:5173).
Expected: the dashboard renders with seeded videos in the Ideas view; no console errors.

- [ ] **Step 4: Manual smoke check (Ideas view)**

Verify each:
- Click a video title → ScriptEditor opens; typing in the notepad and the title persists after close/reopen.
- Expand hooks → click a hook → ScriptEditor opens showing the SAME script as the video; the top field edits the hook text only.
- Add a hook, delete a hook.
- Edit a reference link → the `↗` open-link appears.
- Change pillar and status via the dropdowns.
- Drag a card by its `⠿` handle to reorder.
- Add a new video via the add row.

- [ ] **Step 5: Manual smoke check (Queue view + persistence)**

Verify each:
- Switch to Queue → seeded edited hooks appear; same-video hooks share a colored chip + name.
- Drag to reorder; check a "posted" box → row disappears.
- Click export → a JSON file downloads.
- Reload the page → all changes persisted (localStorage).
- Import the exported file → after confirm, state is restored.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire App with Ideas/Queue views, editor, and IO"
```

---

## Task 15: Neo-brutalist styling

**Files:**
- Modify: `src/index.css` (replace the minimal stylesheet from Task 1)

- [ ] **Step 1: Replace `src/index.css` with the full stylesheet**

```css
:root {
  --bg: #fdf6e3;
  --surface: #fffdf7;
  --ink: #1a1a1a;
  --muted: #8a8578;
  --shadow: 4px 4px 0 var(--ink);
  --shadow-sm: 2px 2px 0 var(--ink);
  --radius: 8px;
  color-scheme: light;
}

* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  background: var(--bg);
  color: var(--ink);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.mono, .brand, .toggle-btn, .chip, .tag, .video-chip, .queue-num, .editor-kicker, .card-ref-label {
  font-family: ui-monospace, 'Space Mono', 'SFMono-Regular', Menlo, monospace;
}

.app { max-width: 920px; margin: 0 auto; padding: 24px 16px 80px; }

/* Header */
.app-header {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin-bottom: 24px;
}
.brand {
  font-size: 22px; font-weight: 700; letter-spacing: 1px;
  background: var(--ink); color: var(--bg);
  padding: 6px 12px; border-radius: var(--radius);
}
.view-toggle { display: flex; border: 2px solid var(--ink); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow-sm); }
.toggle-btn { border: none; background: var(--surface); padding: 7px 14px; cursor: pointer; font-size: 13px; }
.toggle-btn + .toggle-btn { border-left: 2px solid var(--ink); }
.toggle-btn.active { background: var(--ink); color: var(--bg); }

.filters { display: flex; gap: 6px; flex-wrap: wrap; }
.chip {
  border: 2px solid var(--ink); background: var(--surface); color: var(--ink);
  padding: 4px 10px; border-radius: 999px; font-size: 12px; cursor: pointer;
}
.chip.active { box-shadow: var(--shadow-sm); transform: translate(-1px, -1px); }

.header-actions { display: flex; gap: 8px; margin-left: auto; }

/* Buttons */
.btn, .btn-primary, .btn-mini, .file-btn {
  border: 2px solid var(--ink); background: var(--surface); color: var(--ink);
  border-radius: var(--radius); padding: 7px 12px; font-size: 13px; cursor: pointer;
  box-shadow: var(--shadow-sm); transition: transform .05s, box-shadow .05s;
}
.btn:active, .btn-primary:active, .btn-mini:active { transform: translate(2px, 2px); box-shadow: none; }
.btn-primary { background: #ffd166; font-weight: 600; }
.btn-mini { padding: 4px 8px; font-size: 12px; box-shadow: none; }
.file-btn { position: relative; overflow: hidden; }
.file-btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.btn-icon { border: none; background: transparent; font-size: 16px; cursor: pointer; }

/* Inputs */
.input, .select, .card-ref-input, .hook-add-input, .add-idea {
  border: 2px solid var(--ink); background: var(--surface); color: var(--ink);
  border-radius: var(--radius); padding: 7px 10px; font-size: 13px; font-family: inherit;
}
.select { cursor: pointer; }

/* Cards */
.cards { display: flex; flex-direction: column; gap: 14px; }
.card {
  background: var(--surface); border: 2px solid var(--ink); border-left-width: 8px;
  border-radius: var(--radius); box-shadow: var(--shadow); padding: 12px;
}
.card--dragging { opacity: .85; }
.card--posted { opacity: .6; }
.card-top { display: flex; align-items: center; gap: 8px; }
.drag-handle { border: none; background: transparent; cursor: grab; font-size: 16px; color: var(--muted); padding: 0 2px; }
.card-title {
  flex: 1; text-align: left; border: none; background: transparent; cursor: pointer;
  font-size: 15px; font-weight: 600; color: var(--ink); padding: 4px 0;
}
.card-title:hover { text-decoration: underline; }
.pillar-select { border-width: 2px; font-size: 12px; padding: 4px 8px; }
.status-select { font-size: 12px; padding: 4px 8px; }
.status-idea { background: #f0eee8; }
.status-scripted { background: #cfe8ff; }
.status-filmed { background: #e6d6ff; }
.status-edited { background: #ffe9a8; }
.status-posted { background: #c7f0e0; }
.del-btn { border: none; background: transparent; color: var(--muted); font-size: 18px; line-height: 1; cursor: pointer; }
.del-btn:hover { color: #c0392b; }

.card-ref { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.card-ref-label { font-size: 11px; color: var(--muted); text-transform: uppercase; }
.card-ref-input { flex: 1; padding: 5px 8px; font-size: 12px; }
.ref-open { text-decoration: none; font-size: 15px; color: var(--ink); }

.card-hooks-toggle {
  margin-top: 10px; border: none; background: transparent; cursor: pointer;
  font-size: 12px; color: var(--muted);
}

/* Hooks */
.hook-list { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; padding-left: 8px; }
.hook-row { display: flex; align-items: center; gap: 8px; }
.hook-text { flex: 1; text-align: left; border: 1px dashed var(--ink); background: transparent; cursor: pointer; border-radius: 6px; padding: 5px 8px; font-size: 13px; }
.hook-text:hover { background: #fff8e1; }
.hook-row--posted .hook-text { text-decoration: line-through; opacity: .6; }
.hook-posted-flag { font-size: 10px; color: var(--muted); text-transform: uppercase; }
.hook-add { display: flex; gap: 6px; }
.hook-add-input { flex: 1; padding: 5px 8px; font-size: 12px; }

/* Add row */
.add-row { display: flex; gap: 8px; margin-top: 16px; align-items: center; }
.add-idea { flex: 1; }

/* Archive */
.archive { margin-top: 28px; }
.archive-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 10px; }
.archive .card { margin-bottom: 12px; }

/* Tags */
.tag { padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.video-chip { padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; color: #fff; border: 2px solid var(--ink); white-space: nowrap; }

/* Queue */
.queue { display: flex; flex-direction: column; gap: 10px; }
.queue-row {
  display: flex; align-items: center; gap: 10px;
  background: var(--surface); border: 2px solid var(--ink); border-left-width: 8px;
  border-radius: var(--radius); box-shadow: var(--shadow-sm); padding: 10px 12px;
}
.queue-row--dragging { opacity: .85; }
.queue-num { font-size: 13px; font-weight: 700; width: 22px; text-align: center; }
.queue-hook { flex: 1; font-size: 13px; }
.queue-posted { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 4px; cursor: pointer; }
.empty { text-align: center; color: var(--muted); padding: 48px 16px; font-size: 14px; }

/* Script editor slide-over */
.editor-overlay { position: fixed; inset: 0; background: rgba(26, 26, 26, .35); display: flex; justify-content: flex-end; z-index: 1000; }
.editor-panel {
  width: min(520px, 92vw); height: 100%; background: var(--surface);
  border-left: 3px solid var(--ink); box-shadow: -6px 0 0 rgba(26,26,26,.08);
  padding: 20px; display: flex; flex-direction: column; gap: 10px;
}
.editor-head { display: flex; align-items: center; justify-content: space-between; }
.editor-kicker { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); }
.editor-title { border: 2px solid var(--ink); border-radius: var(--radius); padding: 10px; font-size: 16px; font-weight: 600; font-family: inherit; }
.editor-script { flex: 1; border: 2px solid var(--ink); border-radius: var(--radius); padding: 12px; font-size: 14px; line-height: 1.55; font-family: inherit; resize: none; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(26,26,26,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: var(--surface); border: 3px solid var(--ink); border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px; width: min(420px, 92vw); }
.modal h3 { margin: 0 0 14px; }
.pillar-manage-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.pillar-manage-row { display: flex; align-items: center; gap: 10px; }
.swatch { width: 16px; height: 16px; border-radius: 4px; border: 2px solid var(--ink); }
.grow { flex: 1; font-size: 13px; }
.swatch-row { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
.swatch-btn { width: 26px; height: 26px; border-radius: 6px; border: 2px solid var(--ink); cursor: pointer; }
.swatch-btn.selected { box-shadow: var(--shadow-sm); transform: translate(-1px, -1px); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.modal .input { width: 100%; }

.muted { color: var(--muted); }
```

- [ ] **Step 2: Verify styling in the running dev server**

Run: `npm run dev` (if not already running)
Expected: cream background, bold black borders, hard offset shadows, monospace tags/labels, colored left bars on cards and queue rows. Same-video queue rows visibly share a chip color.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: apply neo-brutalist visual design"
```

---

## Task 16: Docs + production build verification

**Files:**
- Create: `README.md`
- Create: `CLAUDE.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# Content Creation Dashboard

A standalone, fully-local dashboard for planning short-form video content. No server, no login — all data lives in your browser (localStorage) with JSON export/import for backup.

## Features

- **Ideas view** — video cards with content pillar, status (Idea → Scripted → Filmed → Edited → Posted), a reference link, and a per-video color identity. Drag to reorder.
- **Hooks** — each video holds multiple hook variations (the same video, different openings).
- **Script notepad** — click a video idea or any of its hooks to open a slide-over notepad. All hooks of a video share one script.
- **Posting queue** — a global, drag-reorderable list of every hook from every Edited video, so you can space out near-identical hooks. Same-video hooks share a color chip.
- **Local & portable** — auto-saves to localStorage; export/import a JSON backup.

## Getting started

```bash
npm install
npm run dev
```

Open the printed URL (default http://localhost:5173).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build
- `npm test` — run unit tests (Vitest)
```

- [ ] **Step 2: Create `CLAUDE.md`**

```markdown
# Content Creation Dashboard

Standalone Vite + React app for planning short-form video content. Fully local — no Supabase, no auth. State persists to localStorage.

## State shape

```
{ pillars: [{id,name,colorIdx}],
  videos:  [{id,idea,pillarId,status,refLink,script,tagColorIdx,hooks:[{id,text,posted}]}],
  postingOrder: [hookId|videoId, ...],
  filter: 'all' | pillarId }
```

- One `useState` object owned by `App.jsx` via `useLocalState`, auto-saved on change.
- Pure helpers (queue derivation, reordering, factories) live in `src/state/contentModel.js` and are unit-tested (`npm test`).
- Each video has ONE shared `script`; all its hooks open the same notepad.
- The posting queue (`deriveQueue`) shows unposted hooks of `Edited` videos; a hookless Edited video shows one virtual entry. Marking a hook posted flags it; marking a hookless entry posted sets the video to `Posted`.
- Drag-reorder via @dnd-kit in both the Ideas card list and the queue.
- IDs via `crypto.randomUUID()`.

## Structure

See `src/` — `components/` (UI), `state/` (model/seed/storage), `hooks/` (persistence), `constants/` (palettes + statuses).
```

- [ ] **Step 3: Verify the production build succeeds**

Run: `npm run build`
Expected: build completes, outputs `dist/` with no errors.

- [ ] **Step 4: Run unit tests one final time**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: add README and CLAUDE.md"
```

---

## Self-Review Notes (resolved)

- **Spec coverage:** standalone Content-only ✓ (Task 14); local + export/import ✓ (Tasks 5, 14); reference link ✓ (Task 10); hooks as sub-ideas ✓ (Tasks 9–10); shared script notepad ✓ (Tasks 8, 14); global posting queue with same-video color chip ✓ (Tasks 12, 3); neo-brutalist UI ✓ (Task 15); unit tests on pure logic ✓ (Task 3).
- **Type consistency:** queue entry fields (`key, videoId, hookId, videoIdea, hookText, pillarId, tagColorIdx`) defined in Task 3's `makeEntry` and consumed identically in Task 12. Handler names (`onOpenIdea, onUpdateVideo, onDeleteVideo, onAddHook, onOpenHook, onDeleteHook`) match between Tasks 10 and 14. `markPosted` reads `entry.hookId`/`entry.videoId` consistent with Task 3.
- **Posted behavior:** hook → `posted:true` (drops out of queue); hookless Edited entry → video `status:'Posted'` (drops out of Edited filter). Consistent across Tasks 3, 12, 14.
- **No placeholders:** every code step contains complete code.
```
