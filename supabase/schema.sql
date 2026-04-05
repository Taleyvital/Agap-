-- AGAPE V2 — exécuter dans l’éditeur SQL Supabase

create extension if not exists "uuid-ossp";

-- Profils (auth.users requis : activer connexion anonyme pour l’onboarding)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  denomination text not null,
  spiritual_level text not null,
  current_challenge text not null,
  anonymous_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Messages chat
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists messages_user_id_idx on public.messages (user_id);

alter table public.messages enable row level security;

create policy "Users manage own messages"
  on public.messages for all
  using (auth.uid() = user_id);

-- Sessions de prière
create table if not exists public.prayer_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  duration_minutes int not null default 0,
  ambiance text,
  completed boolean default false,
  created_at timestamptz default now()
);

alter table public.prayer_sessions enable row level security;

create policy "Users own prayer_sessions"
  on public.prayer_sessions for all
  using (auth.uid() = user_id);

-- Communauté
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'reflections',
  content text not null,
  is_urgent boolean default false,
  created_at timestamptz default now()
);

alter table public.community_posts enable row level security;

create policy "Anyone authenticated read posts"
  on public.community_posts for select
  to authenticated
  using (true);

create policy "Users insert own posts"
  on public.community_posts for insert
  with check (auth.uid() = user_id);

create table if not exists public.community_amens (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);

alter table public.community_amens enable row level security;

create policy "Amens read"
  on public.community_amens for select
  to authenticated
  using (true);

create policy "Users insert own amen"
  on public.community_amens for insert
  with check (auth.uid() = user_id);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table public.community_comments enable row level security;

create policy "Comments read"
  on public.community_comments for select
  to authenticated
  using (true);

create policy "Users insert own comments"
  on public.community_comments for insert
  with check (auth.uid() = user_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  reason text,
  created_at timestamptz default now()
);

alter table public.reports enable row level security;

create policy "Users insert reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create table if not exists public.verse_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book int not null,
  chapter int not null,
  verse int not null,
  translation text not null,
  note text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.verse_notes enable row level security;

create policy "Users own verse_notes"
  on public.verse_notes for all
  using (auth.uid() = user_id);
