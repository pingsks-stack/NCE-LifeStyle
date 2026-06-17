-- ============================================================
-- NCE LifeStyle — เป้าหมายน้ำหนัก (สำหรับพยากรณ์เวลาถึงเป้า + เส้นเป้าบนกราฟ)
-- รันใน Supabase: SQL Editor → New query → วาง → Run
-- ============================================================

alter table public.profiles
  add column if not exists target_weight_kg numeric;
