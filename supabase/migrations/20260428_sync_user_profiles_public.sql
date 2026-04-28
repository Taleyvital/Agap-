-- Trigger: sync user_profiles_public automatiquement à chaque INSERT/UPDATE sur profiles
-- Corrige le problème : les nouveaux utilisateurs n'apparaissaient pas dans la recherche

create or replace function public.sync_user_profiles_public()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles_public (user_id, first_name, avatar_level)
  values (
    new.id,
    coalesce(new.first_name, new.anonymous_name, ''),
    1
  )
  on conflict (user_id) do update
    set first_name = coalesce(excluded.first_name, public.user_profiles_public.first_name);
  return new;
end;
$$;

drop trigger if exists on_profile_upsert on public.profiles;
create trigger on_profile_upsert
  after insert or update of first_name, anonymous_name
  on public.profiles
  for each row
  execute function public.sync_user_profiles_public();

-- Backfill: ajouter tous les profils existants manquants
insert into public.user_profiles_public (user_id, first_name, avatar_level)
select
  id,
  coalesce(first_name, anonymous_name, ''),
  1
from public.profiles
on conflict (user_id) do update
  set first_name = coalesce(excluded.first_name, public.user_profiles_public.first_name);
