-- Gospel Streaming Module — exécuter dans l'éditeur SQL Supabase
-- Requires: auth schema, public.profiles table

-- ── Premium & Admin columns on profiles ──────────────────────
alter table public.profiles
  add column if not exists is_premium boolean not null default false,
  add column if not exists is_admin   boolean not null default false;

-- ── gospel_tracks ─────────────────────────────────────────────
create table if not exists public.gospel_tracks (
  id               uuid primary key default gen_random_uuid(),
  artist_id        uuid references auth.users(id) on delete cascade,
  title            text not null,
  artist_name      text not null,
  album            text,
  duration_seconds int  not null default 0,
  audio_url        text not null,
  cover_url        text,
  lyrics           text,
  genre            text not null default 'Louange',
  language         text not null default 'français',
  status           text not null default 'pending'
                   check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  play_count       int  not null default 0,
  submitted_at     timestamptz not null default now(),
  published_at     timestamptz
);

alter table public.gospel_tracks enable row level security;

-- Authenticated users see approved tracks
create policy "gospel_tracks_read_approved"
  on public.gospel_tracks for select
  to authenticated
  using (status = 'approved');

-- Artists see their own tracks regardless of status
create policy "gospel_tracks_read_own"
  on public.gospel_tracks for select
  to authenticated
  using (auth.uid() = artist_id);

-- Artists can submit tracks
create policy "gospel_tracks_insert"
  on public.gospel_tracks for insert
  to authenticated
  with check (auth.uid() = artist_id);

-- Artists can update their own pending tracks only
create policy "gospel_tracks_update_own_pending"
  on public.gospel_tracks for update
  to authenticated
  using (auth.uid() = artist_id and status = 'pending')
  with check (auth.uid() = artist_id);

-- ── gospel_likes ──────────────────────────────────────────────
create table if not exists public.gospel_likes (
  user_id    uuid references auth.users(id) on delete cascade,
  track_id   uuid references public.gospel_tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

alter table public.gospel_likes enable row level security;

create policy "gospel_likes_read"
  on public.gospel_likes for select
  to authenticated
  using (true);

create policy "gospel_likes_insert"
  on public.gospel_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "gospel_likes_delete"
  on public.gospel_likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- ── gospel_playlists ──────────────────────────────────────────
create table if not exists public.gospel_playlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  title      text not null,
  track_ids  uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.gospel_playlists enable row level security;

create policy "gospel_playlists_own"
  on public.gospel_playlists for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists gospel_tracks_status_idx    on public.gospel_tracks (status);
create index if not exists gospel_tracks_artist_idx    on public.gospel_tracks (artist_id);
create index if not exists gospel_tracks_genre_idx     on public.gospel_tracks (genre);
create index if not exists gospel_tracks_published_idx on public.gospel_tracks (published_at desc);

-- ── Helper function for atomic play count increment ──────────
create or replace function public.increment_gospel_play_count(track_id uuid)
returns void
language sql
security definer
as $$
  update public.gospel_tracks
  set play_count = play_count + 1
  where id = track_id;
$$;

-- ── Storage buckets (run once manually or uncomment) ─────────
-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values
--   ('gospel-audio',  'gospel-audio',  false, 20971520,
--    array['audio/mpeg','audio/mp4','audio/x-m4a','audio/aac']),
--   ('gospel-covers', 'gospel-covers', true,  2097152,
--    array['image/jpeg','image/png','image/webp'])
-- on conflict (id) do nothing;

-- Storage policies for gospel-audio (private, signed URLs)
-- create policy "gospel_audio_insert"
--   on storage.objects for insert to authenticated
--   with check (bucket_id = 'gospel-audio');
-- create policy "gospel_audio_read_own"
--   on storage.objects for select to authenticated
--   using (bucket_id = 'gospel-audio' and auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for gospel-covers (public read)
-- create policy "gospel_covers_insert"
--   on storage.objects for insert to authenticated
--   with check (bucket_id = 'gospel-covers');
-- create policy "gospel_covers_read"
--   on storage.objects for select
--   using (bucket_id = 'gospel-covers');
