-- Migration : ajouter les colonnes manquantes à community_posts
-- et la colonne anonymous_name à community_comments
-- À exécuter dans l'éditeur SQL Supabase

-- Colonnes manquantes de community_posts (déjà utilisées par l'API)
alter table public.community_posts
  add column if not exists anonymous_name text,
  add column if not exists image_url text,
  add column if not exists expires_at timestamptz,
  add column if not exists repost_of uuid references public.community_posts(id) on delete set null;

-- anonymous_name dans community_comments (pour afficher le pseudonyme)
alter table public.community_comments
  add column if not exists anonymous_name text;

-- Politique delete sur community_posts (manquante)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'community_posts' and policyname = 'Users delete own posts'
  ) then
    execute $policy$
      create policy "Users delete own posts"
        on public.community_posts for delete
        using (auth.uid() = user_id)
    $policy$;
  end if;
end $$;

-- Politique delete sur community_amens (manquante)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'community_amens' and policyname = 'Users delete own amen'
  ) then
    execute $policy$
      create policy "Users delete own amen"
        on public.community_amens for delete
        using (auth.uid() = user_id)
    $policy$;
  end if;
end $$;

-- Politique delete sur community_comments
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'community_comments' and policyname = 'Users delete own comments'
  ) then
    execute $policy$
      create policy "Users delete own comments"
        on public.community_comments for delete
        using (auth.uid() = user_id)
    $policy$;
  end if;
end $$;
