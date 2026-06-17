-- ============================================================
-- NCE LifeStyle — เพิ่ม "สัญชาติอาหาร" (cuisine) ให้เมนู
-- รันใน Supabase: SQL Editor → New query → วาง → Run
-- ============================================================

alter table public.foods
  add column if not exists cuisine text default 'อาหารไทย';

-- เมนูที่ยังไม่มีค่า → ตั้งเป็นอาหารไทย (ส่วนใหญ่เป็นไทย แก้รายอันทีหลังได้)
update public.foods set cuisine = 'อาหารไทย' where cuisine is null;
