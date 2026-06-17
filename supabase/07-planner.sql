-- ============================================================
-- NCE LifeStyle — ยกเครื่องหน้าจัดมื้ออาหาร (planner)
-- เพิ่ม "มื้อว่าง" (snack) + "จำนวนเสิร์ฟ" (qty)
-- รันใน Supabase: SQL Editor → New query → วาง → Run
-- ============================================================

-- 1) เปิดให้บันทึกมื้อว่างได้ (เดิม CHECK รับแค่ breakfast/lunch/dinner)
alter table public.meal_entries
  drop constraint if exists meal_entries_slot_check;

alter table public.meal_entries
  add constraint meal_entries_slot_check
  check (slot in ('breakfast', 'lunch', 'dinner', 'snack'));

-- 2) จำนวนเสิร์ฟต่อรายการ (kcal ที่เก็บคือรวมจำนวนแล้ว, qty ไว้โชว์ "×N")
alter table public.meal_entries
  add column if not exists qty numeric not null default 1;
