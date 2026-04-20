-- Reading plans module

create table if not exists public.reading_plans (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  total_days int not null,
  category text,
  is_ai_generated boolean default false,
  created_at timestamptz default now()
);

alter table public.reading_plans enable row level security;

create policy "Reading plans are public"
  on public.reading_plans for select
  using (true);

-- User progress on a reading plan
create table if not exists public.user_plan_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.reading_plans(id) on delete cascade,
  current_day int not null default 1,
  completed_days int not null default 0,
  started_at timestamptz default now(),
  last_read_at timestamptz default now(),
  is_active boolean default true,
  unique(user_id, plan_id)
);

alter table public.user_plan_progress enable row level security;

create policy "Users manage own plan progress"
  on public.user_plan_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Daily reflections for each day of a plan
create table if not exists public.daily_reflections (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.reading_plans(id) on delete cascade,
  day_number int not null,
  title text not null,
  bible_reference text,
  content text,
  reflection_prompt text,
  created_at timestamptz default now(),
  unique(plan_id, day_number)
);

alter table public.daily_reflections enable row level security;

create policy "Daily reflections are public"
  on public.daily_reflections for select
  using (true);
