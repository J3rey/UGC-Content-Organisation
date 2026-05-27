# Content Creation Dashboard — Rebuild Design

Date: 2026-05-27

## Background

The original [United-Dashboard](https://github.com/J3rey/United-Dashboard) is a Vite +
React app with four tabs (Calendar, Finance, Habits, Content) backed by Supabase for auth
and storage, with an in-memory "demo mode" fallback.

This project rebuilds **only the Content tab** as a standalone, fully local app: no Supabase,
no server, no auth. It adds three new capabilities (reference links, sub-ideas a.k.a. hooks,
a global posting queue) and a new visual identity.

## Goals

1. Standalone Content Creation dashboard — drop Calendar / Finance / Habits.
2. Everything local — remove Supabase; persist to the browser with JSON export/import.
3. New features:
   - **Reference link** per video.
   - **Sub-ideas = hooks**: a video holds several hook variations of the same video.
   - **Global posting queue**: one drag-reorderable list of every hook across all Edited
     videos, so near-identical hooks can be spaced apart.
   - **Script notepad**: clicking a video idea or a hook opens an editor with an empty
     notepad to write the script. Replaces the generic notes field.
4. **Same-video visual marker**: each video has an identity color chip so duplicate-video
   hooks are obvious in the queue.
5. New look: playful **neo-brutalist** — simple, minimalistic, fun, different.

## Non-Goals

- No authentication, multi-user, or server sync.
- No Calendar / Finance / Habits features.
- No scheduling/automation of actual posting — the queue is a manual planning tool.

## Tech Stack

- Vite + React 18 (kept).
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` for drag-reorder (kept).
- **Removed**: `@supabase/supabase-js`, `chart.js`, `react-chartjs-2`.
- **Added**: `vitest` for unit tests on pure logic.
- IDs via `crypto.randomUUID()`.

## Data Model

Single state object, persisted to `localStorage`:

```js
{
  pillars: [
    { id, name, colorIdx }            // theme categories (e.g. Vlog, Story)
  ],
  videos: [
    {
      id,
      idea,                           // video concept / title
      pillarId,
      status,                         // 'Idea' | 'Scripted' | 'Filmed' | 'Edited' | 'Posted'
      refLink,                        // reference/inspiration URL (string, may be '')
      script,                         // the video's script (free text, written in the notepad)
      tagColorIdx,                    // video identity color index (VIDEO_COLORS)
      hooks: [
        { id, text, posted, script }  // a hook = one posting variant; has its own script
      ]
    }
  ],
  postingOrder: [hookId, ...],        // global ordering of hooks in the posting queue
  filter: 'all' | pillarId            // pillar filter for the Ideas view
}
```

Notes:
- `tagColorIdx` is assigned on video creation by cycling through `VIDEO_COLORS`, a palette
  kept separate from `PILLAR_COLORS` so video identity never reads as a pillar.
- `postingOrder` holds ids. For an Edited video with at least one hook, those are hook ids.
  For an Edited video with **no** hooks, the video contributes a single virtual queue entry
  keyed by the video's own id (label = the video's `idea`).

## Views

The header has a toggle between two views: **Ideas** and **Queue**.

### Ideas view

A vertical stack of video cards. Active videos are drag-reorderable; videos with status
`Posted` collapse into an archive section at the bottom (like the original's archived posts).

Each card shows:
- **Title** — clicking it opens the **script editor** for the video (see below).
- **Pillar tag** — click to open a popover to change pillar.
- **Status** dropdown (Idea → Scripted → Filmed → Edited → Posted).
- **Video color chip** — the identity color; also visible in the queue.
- **Delete** button.
- **Reference link** — an input; renders as a clickable link (opens new tab) when set.
- **Hooks** (expand/collapse): list of hook rows + an "add hook" affordance and a delete per
  hook. Clicking a hook's text opens the **script editor** for that hook.

Add-video affordance at the bottom (idea + pillar + status), matching the original's add row.

### Script editor

A slide-over/modal opened by clicking a video idea or a hook. It contains:
- An editable text field at the top — the video's idea (or the hook's text).
- A large empty **notepad** textarea below for writing the script.
- Edits save to the item's `script` (and to `idea`/hook `text`) on change/blur; close to dismiss.

The same component serves both videos and hooks; it operates on whichever item is open.

### Queue view (global posting queue)

Lists every **unposted** hook belonging to videos with status `Edited`, ordered by
`postingOrder`. Hooks not yet present in `postingOrder` are appended in video/creation order.

Each row:
- Position number `#`.
- Drag handle (drag to reorder → rewrites `postingOrder`).
- **Video color chip + video name** (the same-video marker).
- Hook text.
- Pillar tag.
- "Mark posted" checkbox → sets `hook.posted = true`, removing it from the active queue.

Behavior:
- Marking a hook posted only flags the hook; the video's `status` stays user-controlled.
- A video that is Edited with zero hooks appears as one row using its `idea` as the label;
  marking it posted is recorded against the video (its own id used as the queue key).

## Persistence

- `useLocalState` hook: on mount, read the localStorage key; if absent, seed from `seed.js`.
  On every state change, write back (JSON-serialized).
- `state/storage.js`: `load()`, `save(state)`, `exportToFile(state)` (triggers a JSON
  download), `importFromFile(file)` (parse + validate, returns state). Import replaces current
  state after a confirm.
- Seed data: the original sample pillars and a handful of videos converted to the new shape
  (each gets `refLink: ''`, `script: ''`, `hooks: []`, an assigned `tagColorIdx`).

## Pure logic (unit-tested)

`state/contentModel.js` holds framework-free helpers, tested with Vitest:
- `newVideo(...)`, `newHook(...)`, `newPillar(...)` — factory/shape helpers.
- `deriveQueue(state)` — produce the ordered queue entries from videos + `postingOrder`,
  including the virtual-entry fallback for hookless Edited videos and exclusion of posted hooks.
- `reorderQueue(postingOrder, fromId, toId)` — compute new ordering after a drag.
- `assignVideoColor(existingVideos)` — pick the next `tagColorIdx`.

## Visual Design — Playful Neo-Brutalist

- **Background**: cream / off-white. **Ink**: near-black for text and borders.
- **Borders**: 2px solid ink. **Shadows**: hard offset (`4px 4px 0` ink), no blur.
- **Corners**: small radius (~6–8px) — boxy but friendly.
- **Type**: monospace for labels, tags, numbers, view toggle; clean sans for body/idea text.
- **Buttons**: chunky, with shadow that collapses (translate) on active/press.
- **Color**: `PILLAR_COLORS` for pillar tags (existing palette), `VIDEO_COLORS` (new, distinct,
  vivid) for video identity chips.

## File Structure

```
src/
  main.jsx
  App.jsx                    # header + Ideas/Queue toggle, owns state via useLocalState
  hooks/
    useLocalState.js         # state + localStorage persistence
  state/
    seed.js                  # initial sample data
    storage.js               # load/save/export/import
    contentModel.js          # pure helpers (unit-tested)
  components/
    Header.jsx               # title, view toggle, filter chips, manage pillars, export/import
    VideoCard.jsx            # idea, pillar, status, refLink, hooks, color chip
    HookList.jsx             # hook rows (click to open script editor) + add hook
    ScriptEditor.jsx         # slide-over notepad for a video idea or a hook
    PostingQueue.jsx         # global drag-reorderable queue
    PillarManagerModal.jsx   # add/delete pillars with colors
    Tag.jsx                  # pillar tag + video color chip primitives
  constants/
    index.js                 # PILLAR_COLORS, VIDEO_COLORS, STATUSES
  index.css                  # neo-brutalist styles
  test/
    contentModel.test.js     # Vitest unit tests
```

## Testing

- **Unit (Vitest)**: `contentModel.js` — queue derivation, reordering, color assignment,
  posted-hook exclusion, hookless-Edited fallback.
- **Manual**: run `npm run dev`, verify add/edit/delete video, hooks, reference link, status
  transitions, drag-reorder in both views, export/import round-trip, and localStorage
  persistence across reload.
```
