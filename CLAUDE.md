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
