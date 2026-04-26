-- Bible Immersive — Mode Histoire
-- Cache narratives générées par l'IA + historique utilisateur

create table if not exists bible_stories (
  id              uuid        not null default gen_random_uuid() primary key,
  passage_ref     text        not null,
  character_name  text        not null,
  title           text,
  narrative_text  text,
  quote           text,
  audio_url       text,
  duration_seconds int,
  language        text        not null default 'fr',
  play_count      int         not null default 0,
  cached_at       timestamptz not null default now(),
  unique (passage_ref, language)
);

create table if not exists user_stories_history (
  user_id     uuid        not null references auth.users on delete cascade,
  story_id    uuid        not null references bible_stories on delete cascade,
  listened_at timestamptz not null default now(),
  completed   boolean     not null default false,
  primary key (user_id, story_id)
);

alter table bible_stories         enable row level security;
alter table user_stories_history  enable row level security;

-- Tout le monde peut lire les histoires (cache public)
create policy "bible_stories_select"
  on bible_stories for select using (true);

-- Insertion via service role côté serveur
create policy "bible_stories_insert"
  on bible_stories for insert with check (true);

create policy "bible_stories_update"
  on bible_stories for update using (true);

-- Historique : chaque utilisateur gère ses propres entrées
create policy "user_stories_history_own"
  on user_stories_history
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Bucket Supabase Storage créé via le dashboard ou via service role
-- Nom : bible-stories-audio | public: false | max 10 Mo par fichier
