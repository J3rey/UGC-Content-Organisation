-- Grant the public anon key access to the shared dashboard snapshot.
--
-- This app has no Supabase user accounts: the only login is a client-side
-- admin gate, and all requests use the public anon key. With RLS enabled and
-- no policy, Supabase rejects every anon write (error 42501) and hides every
-- read, so the dashboard never syncs. This policy opens the table to the anon
-- role. Note: the anon key ships in the browser bundle, so this table is
-- effectively public — do not store anything sensitive in it.

alter table dashboard_snapshots enable row level security;

drop policy if exists "anon full access" on dashboard_snapshots;
create policy "anon full access"
  on dashboard_snapshots
  for all
  to anon
  using (true)
  with check (true);
