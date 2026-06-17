-- ============================================================
-- NCE LifeStyle — เพิ่มคอลัมน์ "ปริมาณ/หน่วยเสิร์ฟ" (portion) สำหรับระบบ AI
-- รันใน Supabase: SQL Editor → New query → วาง → Run
-- ============================================================

alter table public.foods
  add column if not exists portion text;
