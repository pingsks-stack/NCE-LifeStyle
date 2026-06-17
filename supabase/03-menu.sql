-- ============================================================
-- NCE LifeStyle — เพิ่มหมวดหมู่ + รูปภาพให้เมนูอาหาร
-- รันใน Supabase: SQL Editor → New query → วาง → Run
-- ============================================================

alter table public.foods
  add column if not exists category text default 'อื่นๆ',
  add column if not exists image_url text;

-- จัดหมวดหมู่เมนูเดิม
update public.foods set category = 'จานข้าว'
  where name in ('กระเพราไก่','ข้าวขาหมู','ข้าวหน้าไก่','ข้าวหมูกรอบ','ข้าวต้มปลา','ข้าวสวย');
update public.foods set category = 'เส้น'
  where name in ('ผัดซีอิ๊วหมู','ก๋วยเตี๋ยวไก่','ข้าวซอยไก่','ผัดไทย');
update public.foods set category = 'แกง/ต้ม'
  where name in ('ต้มยำกุ้งน้ำใส','แกงเขียวหวานหมู');

-- ใส่รูปจริง (ภาพอาหารจาก LoremFlickr — คงที่ตาม id แต่ละเมนู)
update public.foods
  set image_url = 'https://loremflickr.com/400/300/thai,food?lock=' || id
  where image_url is null;
