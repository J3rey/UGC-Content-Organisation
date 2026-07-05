-- Content Dashboard Supabase schema
create extension if not exists pgcrypto;

create table if not exists dashboard_snapshots (
  id bigserial primary key,
  source_key text not null unique,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists pillars (
  id uuid primary key,
  name text not null,
  color_idx integer not null,
  created_at timestamptz not null default now()
);

create table if not exists videos (
  id uuid primary key,
  idea text not null,
  pillar_id uuid not null references pillars(id) on delete cascade,
  status text not null,
  ref_link text not null default '',
  script text not null default '',
  tag_color_idx integer not null,
  created_at timestamptz not null default now()
);

create table if not exists hooks (
  id uuid primary key,
  video_id uuid not null references videos(id) on delete cascade,
  text text not null,
  posted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists posting_order (
  position integer primary key,
  item_id uuid not null,
  created_at timestamptz not null default now()
);
