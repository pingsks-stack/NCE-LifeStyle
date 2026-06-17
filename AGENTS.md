<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# NCE LifeStyle — คู่มือโปรเจคสำหรับ AI agent

แอปเว็บ **คำนวณแคลอรี่และวางแผนมื้ออาหาร** (ภาษาไทย) — เป็นทั้งโปรเจคจบ/ภาคนิพนธ์และตั้งใจทำเป็นโปรดักต์จริง ชื่อแบรนด์ "NCE LifeStyle" ใช้ตอนเปิดตัวจริง ตอนนี้พัฒนาบน localhost

> นอกจากบล็อก Next.js ด้านบน: `middleware.js` ถูกเปลี่ยนชื่อเป็น **`proxy.js`** (export ฟังก์ชันชื่อ `proxy`) อยู่ที่ `src/proxy.js` ทำหน้าที่ refresh session + ป้องกัน route

---

## โครงสร้างระบบ (System Architecture)

### ภาพรวมการไหลของข้อมูล
```
                        ┌─────────────────── เบราว์เซอร์ (Client) ───────────────────┐
                        │  React 19 + Tailwind v4   ·   ThemeToggle (.dark)          │
                        │  page.js แต่ละหน้า  ─┬─ supabase client (anon key)         │
                        └─────────────────────┼──────────────────────┬──────────────┘
                                              │ (1) อ่าน/เขียนข้อมูล   │ (2) งานพิเศษ/แอดมิน
                                              │     ของตัวเอง (RLS)    │     เรียก fetch()
                          ┌───────────────────▼──────────┐   ┌────────▼─────────────────────┐
                          │  proxy.js (Next 16 middleware) │   │  API routes (src/app/api/*)  │
                          │  refresh session + กันroute    │   │  ฝั่ง server เท่านั้น          │
                          └───────────────────┬──────────┘   │  - getAdminContext() ตรวจสิทธิ์ │
                                              │              │  - service_role key           │
                                              │              │  - เรียก Gemini / scraping     │
                                              ▼              └───┬───────────────┬───────────┘
                                   ┌──────────────────┐         │               │
                                   │     Supabase     │◄────────┘               ▼
                                   │  Postgres + Auth │              ┌────────────────────────┐
                                   │  + RLS policies  │              │ External: Gemini API,   │
                                   └──────────────────┘              │ Wongnai/Wikipedia/Bing  │
                                                                     └────────────────────────┘
```

### 3 รูปแบบการเข้าถึงข้อมูล (สำคัญ — เลือกให้ถูก)
1. **อ่าน/เขียนข้อมูลของตัวเอง** → ใช้ supabase **client** ตรงๆ ในหน้า (anon key) RLS คุมให้เห็นเฉพาะของตัวเอง
   เช่น `meal_entries`, `weight_logs`, `favorites`, อ่าน `foods`/`health_articles`
2. **เขียนข้อมูลกลาง/ข้ามผู้ใช้ หรืองานแอดมิน** → ต้องผ่าน **API route** ที่ใช้ `service_role`
   เช่น แก้/ลบ `foods`, ตั้งแอดมิน, อ่านสถิติข้ามผู้ใช้, สร้าง `health_articles`
3. **เรียก AI / scraping** → ผ่าน **API route** เท่านั้น (ซ่อน key + เลี่ยง CORS)

### ชั้นของระบบ (layers)
```
UI (หน้า + components)        src/app/(app)/*, src/components/*
   │ เรียกใช้
Domain logic (ฟังก์ชันบริสุทธิ์) src/lib/health.js (TDEE/BMI/มาโคร/estimateMacros)
   │
Data access                    supabase client (ในหน้า)  |  API routes + service_role (server)
   │
Storage / External             Supabase Postgres+Auth     |  Gemini, Wongnai, Wikipedia, Bing
```

### ผังโฟลเดอร์ (`src/`)
```
src/
├── proxy.js                     ← refresh session + ป้องกัน route (เดิมคือ middleware.js)
├── app/
│   ├── layout.js                ← root: ฟอนต์ + anti-flash dark-mode script
│   ├── globals.css              ← Tailwind v4 @theme + remap สี dark mode
│   ├── page.js                  ← landing (public)
│   ├── login/  · register/      ← หน้า auth (public)
│   ├── (app)/                   ← กลุ่มหน้าหลังล็อกอิน (มี Navbar)
│   │   ├── layout.js            ← ใส่ Navbar + พื้นหลัง
│   │   ├── home/                ← แดชบอร์ด + เมนูแนะนำ + บทความ AI
│   │   ├── calculate/           ← คำนวณ TDEE → ตั้งเป้าหมาย
│   │   ├── menu/                ← เมนู + เครื่องมือแอดมิน (modal/AI/auto-fill)
│   │   ├── planner/             ← จัดมื้อ (วงแหวนแคล + มาโคร)
│   │   ├── delivery/  weight/  history/
│   │   ├── profile/  profile/edit/
│   │   └── admin/               ← แดชบอร์ดแอดมิน
│   └── api/                     ← server routes
│       ├── ai-kcal/  health-article/
│       ├── update-food/  delete-food/  change-image/
│       ├── import-dishes/  import-wiki/  fill-images/  fix-images/  restaurants/
│       └── admin/{overview,users,set-admin,estimate-macros}/
├── components/                  ← Navbar, LogoutButton, ThemeToggle
└── lib/
    ├── supabase/{client,server}.js   ← Supabase clients
    ├── adminAuth.js  health.js  location.js  provinces.js  sampleData.js
supabase/                        ← ไฟล์ SQL migration (รันมือใน Supabase, ตามลำดับ)
```

### Auth & การป้องกันสิทธิ์
```
ผู้ใช้ล็อกอิน → Supabase Auth ออก session (cookie)
     │
ทุก request → proxy.js refresh session + ถ้าไม่ล็อกอินและเข้าหน้า (app) → redirect /login
     │
หน้า/admin: client เช็ค profiles.is_admin ของตัวเอง (ซ่อน UI)
API แอดมิน: getAdminContext() เช็คซ้ำฝั่ง server (email==admin@nce.com หรือ is_admin) → 403 ถ้าไม่ผ่าน
```
> สิทธิ์มี 2 ชั้นเสมอ: ซ่อน UI ฝั่ง client **และ** ตรวจซ้ำฝั่ง server — อย่าวางใจแค่ client

## Stack
- **Next.js 16.2.6** (App Router, Turbopack) + **React 19** + **JavaScript** (ไม่ใช้ TypeScript)
- **Tailwind CSS v4** (`@theme inline` ใน `globals.css` — ไม่มี `tailwind.config.js`)
- **Supabase**: Postgres + Auth (`@supabase/ssr`, `@supabase/supabase-js`)
- **Recharts** (กราฟ) · **Google Gemini** (AI ฟรี — ดูข้อจำกัดโควต้าด้านล่าง) · ฟอนต์ Noto Sans Thai

## Environment (`.env.local`, gitignored)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   # client
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...            # server เท่านั้น ห้ามหลุดไป client
GEMINI_API_KEY=...
# GEMINI_MODEL=gemini-2.5-flash                     # (ไม่บังคับ) default = gemini-2.5-flash
```
> หลังแก้ `.env.local` ต้อง **restart `next dev`** (Turbopack ไม่รีโหลด env เอง)

---

## Database — migrations (`supabase/`)

**สำคัญ:** ไฟล์ migration **ไม่รันอัตโนมัติ** — ต้องเอาไปวางใน Supabase → SQL Editor → Run เอง **ตามลำดับ** อาการ "บันทึกไม่ได้ / 502 / column does not exist" ส่วนใหญ่มาจากลืมรัน migration ของฟีเจอร์นั้น

| ไฟล์ | เพิ่มอะไร |
|------|-----------|
| `schema.sql` | ตารางหลัก `profiles`, `foods`, `meal_entries`, `favorites` + RLS + trigger สร้างโปรไฟล์อัตโนมัติ + seed เมนู |
| `admin.sql` | `profiles.is_admin` + ฟังก์ชัน `is_admin()` + RLS ให้แอดมินจัดการ `foods` + เลื่อนขั้น `admin@nce.com` |
| `02-features.sql` | profiles: เพศ/ส่วนสูง/น้ำหนัก/กิจกรรม/เป้ามาโคร · meal_entries: `protein_g/carb_g/fat_g` · ตาราง `weight_logs` |
| `03-menu.sql` | foods: `category`, `image_url` |
| `04-more-dishes.sql` | เพิ่มเมนูจำนวนมาก |
| `05-cuisine.sql` | foods: `cuisine` (สัญชาติอาหาร) |
| `06-ai-portion.sql` | foods: `portion` (ปริมาณ/หน่วยเสิร์ฟ) |
| `07-planner.sql` | meal_entries.slot รับ `snack` เพิ่ม + `meal_entries.qty` (จำนวนเสิร์ฟ) |
| `08-food-macros.sql` | foods: `protein_g/carb_g/fat_g` (มาโครต่อหน่วยเสิร์ฟ) |
| `09-health-articles.sql` | ตาราง `health_articles` (บทความ AI รายวัน) |
| `10-weight-goal.sql` | profiles: `target_weight_kg` (เป้าหมายน้ำหนัก + พยากรณ์) |

### ตารางหลัก (สรุป)
- **profiles** — ผูก `auth.users`: `username, full_name, age, job, sex, height_cm, weight_kg, activity_level, daily_goal_kcal, protein_goal_g, carb_goal_g, fat_goal_g, is_admin`
- **foods** — เมนูกลาง (อ่านได้ทุกคน): `name, kcal, emoji, category, cuisine, image_url, portion, protein_g, carb_g, fat_g`
- **meal_entries** — มื้อที่บันทึก (เจ้าของเท่านั้น): `eat_date, slot(breakfast/lunch/dinner/snack), food_name, kcal, qty, protein_g, carb_g, fat_g`
- **favorites**, **weight_logs**, **health_articles** (`article_date` unique)
- RLS: ผู้ใช้เห็นเฉพาะข้อมูลตัวเอง · `foods`/`health_articles` อ่านได้ทุกคน · การเขียนข้ามผู้ใช้ทำผ่าน service_role (API ฝั่ง server)

---

## หน้า (`src/app/(app)/` — มี Navbar + ป้องกันสิทธิ์ผ่าน `proxy.js`)
- **home** — แดชบอร์ด: วงแหวนแคลวันนี้, มาโครวันนี้, **เมนูแนะนำ** (กฎอัจฉริยะตามแคล/มาโครที่เหลือ — ไม่ใช้ AI), **บทความสุขภาพ** (AI รายวัน)
- **calculate** — คำนวณ TDEE/BMR/BMI/มาโคร จากข้อมูลร่างกาย → ปุ่ม "ตั้งเป็นเป้าหมาย" บันทึกลง profile (**ที่เดียว**ที่ตั้งข้อมูลร่างกาย/เป้าแคล)
- **menu** — เรียกดู/ค้นหา/กรอง(หมวด+สัญชาติ) · ปุ่มแอดมิน: ดึงเมนู (Wongnai/Wiki), เติม/ซ่อม/เปลี่ยนรูป, modal แก้ไข/ลบ, AI คำนวณแคล+มาโคร, **เติมมาโครแบบประมาณ (ฟรี)**, **ปรับด้วย AI** (auto-fill ทีละจานตามคิว)
- **planner** — จัดมื้อ: วงแหวนแคล + แถบมาโคร P/C/F เทียบเป้า, ตัวเลือกเมนู (ชิปกรองหมวด+ค้นหา+จำนวนเสิร์ฟ), 4 มื้อ, เลื่อนวันได้
- **delivery** — ร้านเดลิเวอรีจาก Wongnai (server-side scraping) + เลือกตำแหน่ง/จังหวัด (เก็บใน localStorage)
- **weight** — บันทึกน้ำหนัก + กราฟแนวโน้ม + คำนวณ % ไขมัน (US Navy)
- **history** — กราฟแคลย้อนหลัง + รายวัน + เมนูโปรด
- **profile** / **profile/edit** — โปรไฟล์ (edit = ข้อมูลตัวตน ชื่อ/username/อาชีพ เท่านั้น; ร่างกาย/เป้าหมายไป `/calculate`)
- **admin** — แดชบอร์ดแอดมิน: สถิติ, คุณภาพข้อมูลเมนู, จัดการสมาชิก (ตั้ง/ถอนแอดมิน)
- public: `/` (landing), `/login`, `/register`

## Components / lib
- `components/`: `Navbar`, `LogoutButton`, `ThemeToggle`
- `lib/supabase/{client,server}.js` — Supabase clients
- `lib/health.js` — BMR/TDEE/BMI/มาโคร/ไขมัน (Mifflin–St Jeor) + `estimateMacros(kcal, category)`
- `lib/adminAuth.js` — `getAdminContext()` ตรวจสิทธิ์แอดมินฝั่ง server
- `lib/location.js` (localStorage) · `lib/provinces.js` · `lib/sampleData.js` (`blogPosts` สำรอง)

## API routes (`src/app/api/`)
- **ai-kcal** — Gemini ประเมิน kcal+portion+มาโคร แล้ว PATCH ลง foods (admin) มี retry + สลับโมเดล
- **update-food / delete-food / change-image** — จัดการเมนู (ตรวจแอดมิน → service_role)
- **import-dishes** (Wongnai), **import-wiki** (Wikipedia), **fill-images / fix-images** (Bing), **restaurants** (Wongnai delivery)
- **health-article** — ลบบทความเกิน 60 วัน → ถ้าวันนี้ยังไม่มีให้ AI สร้าง 1 บทความ (โควต้าหมดใช้คลังสำรอง) → คืนรายการ
- **admin/overview** (สถิติ), **admin/users**, **admin/set-admin**, **admin/estimate-macros**, **admin/duplicates** (หาเมนูซ้ำ)

---

## Conventions & gotchas (อ่านก่อนแก้!)

1. **ภาษาไทยทั้งแอป** — UI/ข้อความ/comment เป็นไทย เขียนโค้ดใหม่ให้กลมกลืน
2. **Admin** = อีเมล `admin@nce.com` **หรือ** `profiles.is_admin = true`
   - client เช็คจาก profile ตัวเอง · server ใช้ `getAdminContext()`
   - เขียนข้อมูลข้ามผู้ใช้ **ต้องผ่าน API route ด้วย `SUPABASE_SERVICE_ROLE_KEY`** — ห้าม service_role หลุดไป client
3. **AI (Gemini) ฟรี ~20 ครั้ง/วัน/โมเดล** — น้อยมาก!
   - **ห้ามเรียก AI ทุกครั้งที่โหลดหน้า** · ใช้ heuristic ฟรีเป็นค่าตั้งต้น แล้วใช้ AI ยกระดับ (graceful degradation)
   - บทความ: AI **วันละ 1 ครั้ง แชร์ทุกคน** (เก็บ DB) + คลังสำรองเมื่อโควต้าหมด
   - มาโคร: ปุ่ม "เติมแบบประมาณ" (ฟรี, `estimateMacros`) สำหรับ bulk · "ปรับด้วย AI" รายจานเมื่ออยากแม่น
   - ทุก API ที่เรียก AI ต้อง fallback ไม่พังเมื่อ 429/503
4. **Dark mode** — class-based (`.dark` บน `<html>`)
   - `globals.css`: `@custom-variant dark` + **remap ตัวแปรสี zinc/white** ใน `.dark` → ทั้งแอปสลับโทนเอง
   - `neutral-*` / `zinc-950` / `black` **ไม่ถูก remap** → ใช้เป็น "สีดำถาวร" บนพื้นเหลือง brand (เช่น `dark:text-zinc-950`)
   - anti-flash script ใน `layout.js` `<head>` · ปุ่มสลับ = `ThemeToggle` · กราฟ Recharts ใช้ `var(--color-*)`
5. **ESLint (React 19)** — กฎ `react-hooks/set-state-in-effect`: ถ้าต้อง `setState` ใน effect ใส่ `// eslint-disable-next-line react-hooks/set-state-in-effect` บรรทัดก่อนหน้า หรือเรียกใน async callback · **รัน `npm run lint` ให้ผ่านก่อนจบงานเสมอ**
6. **Migrations รันมือ** — สร้างไฟล์ `supabase/NN-*.sql` ใหม่เมื่อแก้ schema แล้วบอกผู้ใช้ให้เอาไปรันเอง (agent รันให้ไม่ได้)
7. **Scraping** (Wongnai/Wiki/Bing) ทำฝั่ง server เลี่ยง CORS — ใช้สำหรับ dev เท่านั้น
8. **ทดสอบ API บนเครื่องนี้** ใช้ `curl.exe` — PowerShell `Invoke-WebRequest` มีปัญหากับ custom header (เคยให้ 401 หลอก)

## Working agreement
- **อย่าเสนอเรื่อง deploy** (Vercel / ขึ้น production / rotate keys เชิงรุก) จนกว่าผู้ใช้จะสั่งเอง
- **ห้ามใช้อีเมล/ข้อมูลจริงของผู้ใช้** ในโค้ดหรือข้อมูลตัวอย่างเด็ดขาด
