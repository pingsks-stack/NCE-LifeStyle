-- ============================================================
-- NCE LifeStyle — โครงฐานข้อมูล (รันใน Supabase: SQL Editor → New query)
-- ผู้ใช้ (auth.users) จัดการโดย Supabase Auth อยู่แล้ว
-- ตารางด้านล่างเก็บข้อมูลเสริมของแอป พร้อมเปิด RLS ให้ผู้ใช้เห็นเฉพาะข้อมูลของตัวเอง
-- ============================================================

-- 1) โปรไฟล์ผู้ใช้ (ผูกกับ auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text,
  full_name   text,
  age         int,
  job         text,
  daily_goal_kcal int default 1800,
  created_at  timestamptz default now()
);

-- 2) ฐานเมนูอาหาร (ใช้ร่วมกันทุกคน — อ่านได้ทุกคน)
create table if not exists public.foods (
  id     bigint generated always as identity primary key,
  name   text not null,
  kcal   int  not null,
  emoji  text default '🍽️'
);

-- 3) มื้ออาหารที่จัดไว้ (planner)
create table if not exists public.meal_entries (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users (id) on delete cascade,
  eat_date  date not null default current_date,
  slot      text not null check (slot in ('breakfast','lunch','dinner')),
  food_name text not null,
  kcal      int  not null,
  created_at timestamptz default now()
);

-- 4) เมนูโปรด
create table if not exists public.favorites (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users (id) on delete cascade,
  food_name text not null,
  kcal      int  not null,
  emoji     text default '❤️',
  created_at timestamptz default now(),
  unique (user_id, food_name)
);

-- ============================================================
-- เปิด Row Level Security (RLS)
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.foods        enable row level security;
alter table public.meal_entries enable row level security;
alter table public.favorites    enable row level security;

-- profiles: เจ้าของเท่านั้น
create policy "own profile - select" on public.profiles
  for select using (auth.uid() = id);
create policy "own profile - upsert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "own profile - update" on public.profiles
  for update using (auth.uid() = id);

-- foods: ทุกคนอ่านได้ (เมนูกลาง)
create policy "foods readable by all" on public.foods
  for select using (true);

-- meal_entries: เจ้าของจัดการได้ทั้งหมด
create policy "own meals - all" on public.meal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- favorites: เจ้าของจัดการได้ทั้งหมด
create policy "own favorites - all" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- สร้างโปรไฟล์อัตโนมัติเมื่อมีผู้ใช้สมัครใหม่
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- เมนูตัวอย่างเริ่มต้น (seed)
-- ============================================================
insert into public.foods (name, kcal, emoji) values
  ('กระเพราไก่', 430, '🍳'),
  ('ข้าวขาหมู', 540, '🍖'),
  ('ข้าวหน้าไก่', 450, '🍗'),
  ('ผัดซีอิ๊วหมู', 480, '🍜'),
  ('ก๋วยเตี๋ยวไก่', 320, '🍲'),
  ('ข้าวหมูกรอบ', 600, '🥓'),
  ('ข้าวซอยไก่', 520, '🍛'),
  ('ผัดไทย', 490, '🍤'),
  ('ข้าวต้มปลา', 325, '🐟'),
  ('ต้มยำกุ้งน้ำใส', 65, '🦐'),
  ('แกงเขียวหวานหมู', 235, '🍵'),
  ('ข้าวสวย', 80, '🍚')
on conflict do nothing;
