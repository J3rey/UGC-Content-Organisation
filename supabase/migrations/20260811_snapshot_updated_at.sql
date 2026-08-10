-- Conflict detection for the shared dashboard snapshot.
--
-- Every save writes the whole snapshot, so two tabs (or a phone and a laptop)
-- silently overwrite each other: the one that saves last wins and the other's
-- edits vanish. This column is the compare-and-set token — the client sends the
-- updated_at it last saw as a filter, so a write only lands if nobody else has
-- written since. A write that matches nothing is a conflict, and the app stops
-- syncing and asks for a reload instead of clobbering the newer data.

alter table dashboard_snapshots
  add column if not exists updated_at timestamptz not null default now();
