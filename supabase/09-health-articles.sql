-- ============================================================
-- NCE LifeStyle — บทความสุขภาพที่ AI สร้างวันละ 1 บทความ (แชร์ทุกคน)
-- เก็บไม่เกิน 60 วัน (ของเก่ากว่านั้นถูกลบอัตโนมัติโดย API)
-- รันใน Supabase: SQL Editor → New query → วาง → Run
-- ============================================================

create table if not exists public.health_articles (
  id           bigint generated always as identity primary key,
  article_date date not null unique,         -- 1 บทความต่อวัน
  title        text not null,
  excerpt      text not null,
  tag          text default 'สุขภาพ',
  emoji        text default '🥗',
  created_at   timestamptz default now()
);

alter table public.health_articles enable row level security;

-- ทุกคนอ่านได้ (เนื้อหาสาธารณะ) — การเขียน/ลบทำผ่าน service_role เท่านั้น
drop policy if exists "articles readable by all" on public.health_articles;
create policy "articles readable by all" on public.health_articles
  for select using (true);
