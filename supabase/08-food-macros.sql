-- ============================================================
-- NCE LifeStyle — เพิ่ม "มาโคร" (โปรตีน/คาร์บ/ไขมัน) ต่อหน่วยเสิร์ฟ ให้เมนู
-- ทำให้หน้าแรกโชว์มาโครรายวันได้จริง (AI ประเมินค่าให้ตอนคำนวณแคล)
-- รันใน Supabase: SQL Editor → New query → วาง → Run
-- ============================================================

alter table public.foods
  add column if not exists protein_g numeric,
  add column if not exists carb_g numeric,
  add column if not exists fat_g numeric;
