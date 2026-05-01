-- Push subscriptions
create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  device_type text check (device_type in ('android', 'ios', 'desktop')) default 'desktop',
  created_at timestamptz default now(),
  last_used_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "Users see own subscriptions"
  on push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users insert own subscriptions"
  on push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users delete own subscriptions"
  on push_subscriptions for delete
  using (auth.uid() = user_id);

-- Notification logs
create table if not exists notification_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text,
  title text,
  body text,
  sent_at timestamptz default now(),
  clicked boolean default false
);

alter table notification_logs enable row level security;

create policy "Users see own notification logs"
  on notification_logs for select
  using (auth.uid() = user_id);

-- Add notification_preferences column to profiles if not present
alter table profiles
  add column if not exists notification_preferences jsonb default '{
    "flames": true,
    "plan_reminder": true,
    "amen_received": true,
    "gospel_approved": true,
    "prayer_reminder": false,
    "xp_level": true,
    "verse_received": true
  }'::jsonb;
