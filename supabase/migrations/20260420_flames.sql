-- Flammes Spirituelles — tables et RLS

-- Profils publics (prénom + niveau avatar)
create table if not exists public.user_profiles_public (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  avatar_level int not null default 1,
  created_at timestamptz default now()
);

alter table public.user_profiles_public enable row level security;

create policy "Profils publics lisibles par utilisateurs connectés"
  on public.user_profiles_public for select
  using (auth.role() = 'authenticated');

create policy "Utilisateur gère son propre profil public"
  on public.user_profiles_public for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Remplir user_profiles_public depuis profiles existants
insert into public.user_profiles_public (user_id, first_name, avatar_level)
select id, coalesce(first_name, anonymous_name, ''), 1
from public.profiles
on conflict (user_id) do nothing;

-- Follows (abonnements)
create table if not exists public.follows (
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id)
);

alter table public.follows enable row level security;

create policy "Chacun voit ses propres follows"
  on public.follows for select
  using (auth.uid() = follower_id or auth.uid() = following_id);

create policy "Chacun gère ses propres follows"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Chacun supprime ses propres follows"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- Messages de versets
create table if not exists public.verse_messages (
  id          uuid primary key default uuid_generate_v4(),
  sender_id   uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  verse_ref   text not null,
  verse_text  text not null,
  message     text,
  read_at     timestamptz,
  created_at  timestamptz default now()
);

alter table public.verse_messages enable row level security;

create policy "Participants voient leurs messages"
  on public.verse_messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Expéditeur crée un message"
  on public.verse_messages for insert
  with check (auth.uid() = sender_id);

create policy "Destinataire marque comme lu"
  on public.verse_messages for update
  using (auth.uid() = receiver_id);

-- Streaks de flammes
create table if not exists public.verse_streaks (
  id                 uuid primary key default uuid_generate_v4(),
  user_a             uuid not null references auth.users(id) on delete cascade,
  user_b             uuid not null references auth.users(id) on delete cascade,
  streak_count       int not null default 1,
  last_exchange_date date not null default current_date,
  user_a_sent_today  boolean not null default false,
  user_b_sent_today  boolean not null default false,
  updated_at         timestamptz default now(),
  unique(user_a, user_b)
);

alter table public.verse_streaks enable row level security;

create policy "Participants voient leur streak"
  on public.verse_streaks for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "Participants gèrent leur streak"
  on public.verse_streaks for all
  using (auth.uid() = user_a or auth.uid() = user_b)
  with check (auth.uid() = user_a or auth.uid() = user_b);

-- Index pour les requêtes fréquentes
create index if not exists verse_messages_receiver_idx on public.verse_messages(receiver_id, created_at desc);
create index if not exists verse_messages_sender_idx   on public.verse_messages(sender_id, created_at desc);
create index if not exists follows_following_idx       on public.follows(following_id);
