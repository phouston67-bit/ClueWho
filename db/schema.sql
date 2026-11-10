-- ClueWho Supabase schema
--
-- Supabase is optional: the game is fully playable without it (round state
-- lives in signed tokens, score/streak live in client state/localStorage).
-- When configured, this schema adds cross-device streak persistence and a
-- global leaderboard.
--
-- Run this file's contents in the Supabase SQL editor (or via `supabase db
-- push` / migrations) against a fresh project.

-- Enable the pgcrypto extension for gen_random_uuid().
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- users
--
-- Supports anonymous guest players (identified by a client-generated UUID
-- stored in localStorage) as well as optionally-linked Supabase Auth users.
-- ---------------------------------------------------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  -- Set when the guest later signs in via Supabase Auth; null for pure guests.
  auth_user_id uuid references auth.users (id) on delete set null,
  display_name text,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_auth_user_id_idx on users (auth_user_id);

-- ---------------------------------------------------------------------------
-- people (optional cache of the curated dataset, mirrors data/people.json)
--
-- Keeping this in Postgres is optional - the app reads data/people.json
-- directly on the server by default - but a table is provided for anyone
-- who wants to manage the dataset via Supabase instead of a JSON file, or
-- to join round history against person metadata.
-- ---------------------------------------------------------------------------
create table if not exists people (
  id text primary key,
  name text not null,
  category text not null,
  aliases text[] not null default '{}',
  facts text[] not null default '{}',
  reveal_fact text not null,
  wikidata_id text,
  image_commons_file_url text,
  image_license text,
  image_attribution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- rounds
--
-- One row per finished round, written by the server (service role) after
-- /api/round/reveal computes the final score. Useful for analytics, abuse
-- detection, and per-user streak history.
-- ---------------------------------------------------------------------------
create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id) on delete set null,
  person_id text references people (id) on delete set null,
  category text not null,
  questions_used integer not null default 0,
  wrong_guesses integer not null default 0,
  elapsed_seconds integer not null default 0,
  won boolean not null,
  final_score integer not null default 0,
  streak_after_round integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists rounds_user_id_idx on rounds (user_id);
create index if not exists rounds_created_at_idx on rounds (created_at desc);

-- ---------------------------------------------------------------------------
-- leaderboard_entries
--
-- A denormalized, append-only table purpose-built for fast "top scores" /
-- "best streaks" queries without aggregating over the full rounds table.
-- ---------------------------------------------------------------------------
create table if not exists leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id) on delete set null,
  display_name text not null default 'Anonymous',
  round_id uuid references rounds (id) on delete cascade,
  score integer not null,
  streak integer not null default 0,
  category text not null,
  created_at timestamptz not null default now()
);

create index if not exists leaderboard_entries_score_idx
  on leaderboard_entries (score desc);
create index if not exists leaderboard_entries_streak_idx
  on leaderboard_entries (streak desc);

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS) policy stubs
--
-- Enabled but intentionally permissive-by-default stubs: tighten these
-- before going to production with real user data. Writes to `rounds` and
-- `leaderboard_entries` should generally only happen via the service-role
-- key from trusted API routes (lib/supabase.ts -> getSupabaseAdminClient),
-- which bypasses RLS entirely - so the client-facing policies below mainly
-- need to cover read access for the public leaderboard.
-- ---------------------------------------------------------------------------

alter table users enable row level security;
alter table people enable row level security;
alter table rounds enable row level security;
alter table leaderboard_entries enable row level security;

-- Anyone can read the public leaderboard.
create policy "Public can read leaderboard entries"
  on leaderboard_entries for select
  using (true);

-- Anyone can read the (non-secret) people metadata cache, if used.
create policy "Public can read people cache"
  on people for select
  using (true);

-- Users can read their own row (e.g. to show best streak across devices).
-- TODO: tighten this once real Supabase Auth is wired up, e.g.:
--   using (auth.uid() = auth_user_id)
create policy "Users can read their own profile"
  on users for select
  using (true);

-- Anonymous guests can post a leaderboard entry directly from the browser
-- (anon key) after a round ends. This is intentionally permissive for a
-- casual, low-stakes game. TODO: add rate limiting / abuse detection (e.g.
-- a Postgres function + trigger validating score is plausible) before
-- relying on this for a competitive/real-money leaderboard.
create policy "Anyone can insert a leaderboard entry"
  on leaderboard_entries for insert
  with check (true);

-- Allow anonymous guest profile upserts (streak tracking) from the browser.
-- TODO: tighten to `using (auth.uid() = auth_user_id)` once auth is added.
create policy "Anyone can upsert a guest user profile"
  on users for insert
  with check (true);

create policy "Anyone can update a guest user profile"
  on users for update
  using (true)
  with check (true);

-- Rounds are not directly readable by anon clients by default; uncomment
-- and scope to the owning user once auth is wired up.
-- create policy "Users can read their own rounds"
--   on rounds for select
--   using (auth.uid() = (select auth_user_id from users where users.id = rounds.user_id));
