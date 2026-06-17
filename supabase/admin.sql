-- ============================================================
-- NCE LifeStyle — ระบบแอดมิน (superadmin)
-- รันใน Supabase: SQL Editor → New query → วาง → Run
-- ============================================================

-- 1) เพิ่มคอลัมน์ is_admin ในตารางโปรไฟล์
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2) ฟังก์ชันเช็คว่าผู้ใช้ปัจจุบันเป็นแอดมินหรือไม่ (ใช้ใน RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- 3) ให้แอดมินจัดการเมนูอาหาร (foods) ได้ — เพิ่ม/แก้/ลบ
drop policy if exists "admin manage foods" on public.foods;
create policy "admin manage foods" on public.foods
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 4) เลื่อนขั้นบัญชีให้เป็นแอดมิน
--    *** ทำหลังจากสร้างผู้ใช้ใน Authentication → Users แล้วเท่านั้น ***
--    เปลี่ยนอีเมลด้านล่างให้ตรงกับบัญชี superadmin ที่สร้างไว้
-- ============================================================
update public.profiles
set is_admin = true
where id = (
  select id from auth.users
  where email = 'admin@nce.com'   -- << บัญชี superadmin ของเรา
);

-- ตรวจสอบผล: ควรเห็นแถวที่ is_admin = true
select p.id, u.email, p.is_admin
from public.profiles p
join auth.users u on u.id = p.id
where p.is_admin = true;
