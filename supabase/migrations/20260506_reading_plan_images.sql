-- Keep reading plan media fields reproducible across environments.

alter table public.reading_plans
  add column if not exists image_url text,
  add column if not exists author text;

alter table public.daily_reflections
  add column if not exists image_url text;
