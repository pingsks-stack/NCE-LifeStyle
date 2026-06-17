-- ============================================================
-- NCE LifeStyle — migration ฟีเจอร์ใหม่
-- (TDEE/ข้อมูลร่างกาย, ติดตามมาโคร, บันทึกน้ำหนัก)
-- รันใน Supabase: SQL Editor → New query → วาง → Run
-- ============================================================

-- 1) profiles: ข้อมูลร่างกาย + เป้าหมายมาโคร
alter table public.profiles
  add column if not exists sex text,                         -- 'male' / 'female'
  add column if not exists height_cm numeric,
  add column if not exists weight_kg numeric,
  add column if not exists activity_level text default 'moderate',
  add column if not exists protein_goal_g int,
  add column if not exists carb_goal_g int,
  add column if not exists fat_goal_g int;

-- 2) meal_entries: เก็บมาโครต่อมื้อ (ไว้ติดตามมาโครรายวัน)
alter table public.meal_entries
  add column if not exists protein_g numeric default 0,
  add column if not exists carb_g numeric default 0,
  add column if not exists fat_g numeric default 0;

-- 3) ตารางบันทึกน้ำหนัก
create table if not exists public.weight_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  log_date   date not null default current_date,
  weight_kg  numeric not null,
  created_at timestamptz default now()
);

alter table public.weight_logs enable row level security;

drop policy if exists "own weight - all" on public.weight_logs;
create policy "own weight - all" on public.weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
