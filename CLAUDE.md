# Content Creation Dashboard

Standalone Vite + React app for planning short-form video content. Open by default — no login required; state persists to localStorage. An optional email/password sign-in lives top-right in the header (`AuthGate.jsx`); signing in switches storage from localStorage to Supabase (`useAppState.js` upserts/loads a per-user row in `dashboard_snapshots`). Supabase is inert unless `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set (in `.env` locally and in Vercel) — until then the sign-in field shows but errors on submit.

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
