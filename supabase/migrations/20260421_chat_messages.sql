create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_pair_idx
  on public.chat_messages (sender_id, receiver_id, created_at);
create index if not exists chat_messages_receiver_idx
  on public.chat_messages (receiver_id, read_at)
  where read_at is null;

alter table public.chat_messages enable row level security;

create policy "Users can send chat messages"
  on public.chat_messages for insert
  to authenticated
  with check (sender_id = auth.uid());

create policy "Users can read their chat messages"
  on public.chat_messages for select
  to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "Users can mark chat messages as read"
  on public.chat_messages for update
  to authenticated
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());
