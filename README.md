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
