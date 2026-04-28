-- Avatar customization per user
create table if not exists avatar_customization (
  user_id          uuid references auth.users primary key,
  skin_tone        text not null default 'tone3',
  eye_shape        text not null default 'almond',
  eye_color        text not null default 'brown',
  eyebrow_style    text not null default 'natural',
  nose_shape       text not null default 'rounded',
  mouth_style      text not null default 'smile',
  hair_style       text not null default 'short',
  hair_color       text not null default 'black',
  beard_style      text not null default 'none',
  accessory        text not null default 'none',
  background_color text not null default '#1a1830',
  updated_at       timestamptz not null default now()
);

alter table avatar_customization enable row level security;
create policy "Users manage own avatar" on avatar_customization
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Shop items catalogue
create table if not exists avatar_shop_items (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,
  item_id     text not null unique,
  name        text not null,
  price_coins int  not null default 0,
  preview_svg text,
  is_premium  boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table avatar_shop_items enable row level security;
create policy "Anyone reads shop items" on avatar_shop_items
  for select using (true);

-- User coin balances
create table if not exists user_coins (
  user_id      uuid references auth.users primary key,
  balance      int  not null default 0,
  total_earned int  not null default 0,
  updated_at   timestamptz not null default now()
);

alter table user_coins enable row level security;
create policy "Users read own coins" on user_coins
  for select using (auth.uid() = user_id);
create policy "Service role manages coins" on user_coins
  for all using (true);

-- Purchases (append-only)
create table if not exists user_purchased_items (
  user_id      uuid references auth.users,
  item_id      text references avatar_shop_items(item_id),
  purchased_at timestamptz not null default now(),
  primary key  (user_id, item_id)
);

alter table user_purchased_items enable row level security;
create policy "Users read own purchases" on user_purchased_items
  for select using (auth.uid() = user_id);
create policy "Service role manages purchases" on user_purchased_items
  for all using (true);

-- Atomic coin increment (SECURITY DEFINER so service role bypasses RLS)
create or replace function increment_coins(p_user_id uuid, p_amount int)
returns void
language plpgsql
security definer
as $$
begin
  insert into user_coins (user_id, balance, total_earned)
  values (p_user_id, greatest(0, p_amount), greatest(0, p_amount))
  on conflict (user_id)
  do update set
    balance      = user_coins.balance + p_amount,
    total_earned = user_coins.total_earned + greatest(0, p_amount),
    updated_at   = now();
end;
$$;

-- Seed shop items
insert into avatar_shop_items (category, item_id, name, price_coins, is_premium) values
  -- Premium hairstyles
  ('hair', 'locks',       'Dreadlocks',     200, true),
  ('hair', 'braids_long', 'Nattes longues',  250, true),
  ('hair', 'cornrows',    'Cornrows',        150, true),
  ('hair', 'fade',        'Dégradé',         150, true),
  ('hair', 'curly_long',  'Boucles longues', 200, true),
  ('hair', 'hijab',       'Hijab',           300, true),
  ('hair', 'twists',      'Twists',          175, true),
  -- Beards
  ('beard', 'beard_full',   'Barbe complète', 200, true),
  ('beard', 'beard_short',  'Barbe courte',   150, true),
  ('beard', 'goatee',       'Bouc',           100, true),
  ('beard', 'mustache',     'Moustache',      100, true),
  -- Accessories
  ('accessory', 'glasses_round',   'Lunettes rondes',      200, true),
  ('accessory', 'glasses_rect',    'Lunettes rectangulaires', 200, true),
  ('accessory', 'crown',           'Couronne dorée',        500, true),
  ('accessory', 'halo',            'Auréole violette',      300, true),
  ('accessory', 'headphones',      'Écouteurs',             250, true),
  ('accessory', 'cross_necklace',  'Collier croix',         200, true),
  ('accessory', 'flower',          'Fleur',                 150, true),
  -- Premium backgrounds
  ('background', 'bg_violet',   'Violet profond',   100, true),
  ('background', 'bg_blue',     'Bleu nuit',        100, true),
  ('background', 'bg_red',      'Rouge sombre',     100, true),
  ('background', 'bg_green',    'Vert forêt',       100, true),
  ('background', 'bg_golden',   'Doré',             200, true)
on conflict (item_id) do nothing;
