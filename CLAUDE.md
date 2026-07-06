# Content Creation Dashboard

Standalone Vite + React app for planning short-form video content. Open by default — no login required; state persists to localStorage. A simple local login (username/password, default `admin`/`Potato01`, overridable via `VITE_LOCAL_LOGIN_USERNAME`/`VITE_LOCAL_LOGIN_PASSWORD`) sits top-right in the header (`AuthGate.jsx`). Signing in switches storage from localStorage to Supabase: `useAppState.js` upserts/loads one shared row in `dashboard_snapshots` keyed `local:<username>` (no per-user Supabase accounts — the anon key + local gate is the only auth). Requires `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (`.env` locally and in Vercel); without them sign-in still gates but data stays in localStorage.

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
