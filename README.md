# 🥗 NCE LifeStyle

**แอปคำนวณแคลอรี่และวางแผนมื้ออาหารภาษาไทย**  
โปรเจคภาคนิพนธ์ / ระบบจัดการสุขภาพส่วนตัวครบวงจร

---

## ภาพรวม

NCE LifeStyle ช่วยให้ผู้ใช้คำนวณพลังงานที่ร่างกายต้องการ (TDEE/BMR/BMI) วางแผนมื้ออาหารรายวัน ติดตามน้ำหนัก และรับบทความสุขภาพที่สร้างโดย AI ทุกวัน รองรับ dark mode และออกแบบมาให้ใช้งานบนมือถือได้สะดวก

### ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---------|------------|
| 🔢 คำนวณ TDEE/BMR/BMI | สูตร Mifflin–St Jeor + ระดับกิจกรรม 5 ระดับ |
| 🍱 วางแผนมื้ออาหาร | 4 มื้อ/วัน (เช้า/กลาง/เย็น/ของว่าง) + วงแหวนแคลและแถบมาโคร |
| 📊 ติดตามสุขภาพ | กราฟแคลย้อนหลัง กราฟน้ำหนัก คำนวณ % ไขมัน (US Navy) |
| 🤖 AI บทความสุขภาพ | Gemini สร้างบทความรายวัน แชร์กันทุกผู้ใช้ ประหยัดโควต้า |
| 🍜 ฐานเมนูอาหารไทย | ค้นหา/กรองหมวด/สัญชาติ พร้อมรูปภาพและข้อมูลมาโคร |
| 🛵 ร้านเดลิเวอรีใกล้บ้าน | ดึงร้านค้า Wongnai ตามตำแหน่ง/จังหวัด |
| ⭐ เมนูโปรด | บันทึกเมนูที่ชื่นชอบ ดูสถิติในหน้าประวัติ |
| 🌙 Dark mode | สลับธีมมืด/สว่าง จำค่าไว้ในเครื่อง |
| 🔐 ระบบ Admin | จัดการเมนู ดูสถิติผู้ใช้ ตั้ง/ถอนสิทธิ์แอดมิน |

---

## Tech Stack

| ชั้น | เทคโนโลยี |
|-----|-----------|
| Frontend | Next.js 16.2 (App Router) + React 19 |
| Styling | Tailwind CSS v4 (`@theme inline`) |
| Database & Auth | Supabase (PostgreSQL + Row Level Security) |
| Charts | Recharts 3 |
| AI | Google Gemini API (`gemini-2.5-flash`) |
| Language | JavaScript (ไม่ใช้ TypeScript) |
| Font | Noto Sans Thai |

---

## โครงสร้างโปรเจค

```
NCE-LifeStyle/
├── src/
│   ├── proxy.js                        # Session refresh + ป้องกัน route (แทน middleware.js)
│   ├── app/
│   │   ├── layout.js                   # Root layout: ฟอนต์ + anti-flash dark mode
│   │   ├── globals.css                 # Tailwind v4 @theme + dark mode color remap
│   │   ├── page.js                     # Landing page (สาธารณะ)
│   │   ├── login/page.js               # หน้าเข้าสู่ระบบ
│   │   ├── register/page.js            # หน้าสมัครสมาชิก
│   │   ├── manifest.js                 # Web App Manifest
│   │   │
│   │   ├── (app)/                      # หน้าหลัง login (มี Navbar + ป้องกันสิทธิ์)
│   │   │   ├── layout.js               # Navbar + พื้นหลัง
│   │   │   ├── home/page.js            # แดชบอร์ด: วงแหวนแคล + เมนูแนะนำ + บทความ AI
│   │   │   ├── calculate/page.js       # คำนวณ TDEE/BMR/BMI/มาโคร → ตั้งเป้าหมาย
│   │   │   ├── menu/page.js            # เรียกดู/ค้นหา/จัดการเมนูอาหาร
│   │   │   ├── planner/page.js         # วางแผนมื้ออาหาร 4 มื้อ/วัน
│   │   │   ├── delivery/page.js        # ร้านเดลิเวอรีจาก Wongnai
│   │   │   ├── weight/page.js          # บันทึกน้ำหนัก + กราฟ + % ไขมัน
│   │   │   ├── history/page.js         # กราฟแคลย้อนหลัง + รายวัน + เมนูโปรด
│   │   │   ├── profile/page.js         # โปรไฟล์ผู้ใช้
│   │   │   ├── profile/edit/page.js    # แก้ไขข้อมูลตัวตน
│   │   │   └── admin/page.js           # แดชบอร์ดแอดมิน
│   │   │
│   │   └── api/                        # Server-side API routes
│   │       ├── ai-kcal/                # Gemini ประเมินแคล + มาโครจากชื่อเมนู
│   │       ├── health-article/         # สร้าง/คืนบทความสุขภาพ AI รายวัน
│   │       ├── update-food/            # แก้ไขเมนู (admin)
│   │       ├── delete-food/            # ลบเมนู (admin)
│   │       ├── change-image/           # เปลี่ยนรูปเมนู (admin)
│   │       ├── import-dishes/          # ดึงเมนูจาก Wongnai (dev)
│   │       ├── import-wiki/            # ดึงเมนูจาก Wikipedia (dev)
│   │       ├── fill-images/            # เติมรูปจาก Bing (dev)
│   │       ├── fix-images/             # ซ่อมรูปที่โหลดไม่ได้ (dev)
│   │       ├── restaurants/            # ร้านเดลิเวอรี Wongnai
│   │       └── admin/
│   │           ├── overview/           # สถิติภาพรวม
│   │           ├── users/              # รายชื่อผู้ใช้
│   │           ├── set-admin/          # ตั้ง/ถอนแอดมิน
│   │           ├── estimate-macros/    # เติมมาโครแบบประมาณทั้งหมด
│   │           └── duplicates/         # หาเมนูซ้ำ
│   │
│   ├── components/
│   │   ├── Navbar.js                   # แถบนำทางหลัก
│   │   ├── LogoutButton.js             # ปุ่มออกจากระบบ
│   │   └── ThemeToggle.js              # ปุ่มสลับ dark/light mode
│   │
│   └── lib/
│       ├── health.js                   # BMR/TDEE/BMI/มาโคร/ไขมัน (pure functions)
│       ├── adminAuth.js                # getAdminContext() ตรวจสิทธิ์ฝั่ง server
│       ├── location.js                 # จัดการตำแหน่ง (localStorage)
│       ├── provinces.js                # รายชื่อจังหวัดไทย
│       ├── sampleData.js               # บทความสำรองเมื่อ AI โควต้าหมด
│       └── supabase/
│           ├── client.js               # Supabase client (browser, anon key)
│           └── server.js               # Supabase server (API routes, service_role)
│
├── supabase/                           # SQL migrations (รันมือใน Supabase)
│   ├── schema.sql                      # ตารางหลัก + RLS + seed เมนู
│   ├── admin.sql                       # สิทธิ์แอดมิน
│   ├── 02-features.sql                 # เพศ/ส่วนสูง/มาโคร/weight_logs
│   ├── 03-menu.sql                     # foods: category, image_url
│   ├── 04-more-dishes.sql              # เพิ่มเมนูจำนวนมาก
│   ├── 05-cuisine.sql                  # foods: cuisine (สัญชาติ)
│   ├── 06-ai-portion.sql               # foods: portion (หน่วยเสิร์ฟ)
│   ├── 07-planner.sql                  # meal_entries: slot snack + qty
│   ├── 08-food-macros.sql              # foods: protein_g/carb_g/fat_g
│   ├── 09-health-articles.sql          # ตาราง health_articles
│   └── 10-weight-goal.sql              # profiles: target_weight_kg
│
├── public/                             # Static assets
├── package.json
├── next.config.mjs
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## การตั้งค่าและรัน

### ความต้องการเบื้องต้น

- Node.js 18+
- บัญชี [Supabase](https://supabase.com) (ฟรี)
- Google Gemini API Key (ฟรี — [Google AI Studio](https://aistudio.google.com))

### 1. Clone และติดตั้ง Dependencies

```bash
git clone https://github.com/pingsks-stack/NCE-LifeStyle.git
cd NCE-LifeStyle
npm install
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` ที่ root ของโปรเจค:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
GEMINI_API_KEY=AIza...
# GEMINI_MODEL=gemini-2.5-flash   # ไม่บังคับ, ค่าเริ่มต้น = gemini-2.5-flash
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` ใช้ฝั่ง server เท่านั้น — ห้ามใส่ใน client code เด็ดขาด

### 3. ตั้งค่า Supabase Database

เข้าไปที่ **Supabase Dashboard → SQL Editor** แล้วรัน SQL ตามลำดับ:

```
supabase/schema.sql          ← รันก่อนเป็นอันดับแรก
supabase/admin.sql
supabase/02-features.sql
supabase/03-menu.sql
supabase/04-more-dishes.sql
supabase/05-cuisine.sql
supabase/06-ai-portion.sql
supabase/07-planner.sql
supabase/08-food-macros.sql
supabase/09-health-articles.sql
supabase/10-weight-goal.sql  ← รันล่าสุด
```

> ถ้าข้ามไฟล์ใดไฟล์หนึ่ง อาจเจอ error "column does not exist" หรือบันทึกไม่ได้

### 4. รันในโหมด Development

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

> **หมายเหตุ:** Turbopack ไม่รีโหลด env เองอัตโนมัติ — หลังแก้ `.env.local` ต้อง restart `npm run dev` ทุกครั้ง

### 5. คำสั่งอื่น ๆ

```bash
npm run build    # build สำหรับ production
npm run start    # รัน production server
npm run lint     # ตรวจสอบ code style (ควรรันก่อน commit)
```

---

## ระบบฐานข้อมูล

### ตารางหลัก

| ตาราง | คำอธิบาย | RLS |
|-------|---------|-----|
| `profiles` | ข้อมูลผู้ใช้ (ผูกกับ `auth.users`): ชื่อ, อายุ, ส่วนสูง, น้ำหนัก, เป้าหมายแคล/มาโคร, is_admin | เจ้าของเท่านั้น |
| `foods` | ฐานเมนูอาหารกลาง: ชื่อ, kcal, emoji, หมวด, สัญชาติ, รูป, portion, มาโคร | อ่านได้ทุกคน / เขียนผ่าน service_role |
| `meal_entries` | มื้ออาหารที่บันทึก: วันที่, มื้อ, ชื่อเมนู, kcal, qty, มาโคร | เจ้าของเท่านั้น |
| `favorites` | เมนูโปรดของแต่ละคน | เจ้าของเท่านั้น |
| `weight_logs` | บันทึกน้ำหนักรายวัน | เจ้าของเท่านั้น |
| `health_articles` | บทความสุขภาพ AI รายวัน (แชร์ทุกคน) | อ่านได้ทุกคน / เขียนผ่าน service_role |

### 3 รูปแบบการเข้าถึงข้อมูล

```
1. ข้อมูลตัวเอง   → supabase client (anon key) ในหน้า — RLS คุมให้เอง
2. งานข้ามผู้ใช้  → API route ที่ใช้ service_role key
3. AI / Scraping  → API route เท่านั้น (ซ่อน key + เลี่ยง CORS)
```

---

## สถาปัตยกรรมระบบ

```
เบราว์เซอร์ (React 19 + Tailwind v4)
     │
     ├── supabase client ─────────────────────→ Supabase (Postgres + Auth)
     │   อ่าน/เขียนข้อมูลตัวเอง (RLS)              Row Level Security
     │
     └── fetch() API routes
              │
         src/app/api/*  (Server-side)
              ├── getAdminContext() ตรวจสิทธิ์
              ├── supabase service_role
              ├── Google Gemini API
              └── Wongnai / Wikipedia / Bing (scraping, dev only)

src/proxy.js  ← ทำงานทุก request: refresh session + redirect ถ้าไม่ login
```

---

## ระบบ Auth & สิทธิ์

- **ผู้ใช้ทั่วไป** — สมัครผ่าน Supabase Auth, มี session cookie
- **แอดมิน** — อีเมล `admin@nce.com` หรือ `profiles.is_admin = true`
  - UI ซ่อนฝั่ง client ตรวจจาก profile ตัวเอง
  - API ตรวจซ้ำฝั่ง server ด้วย `getAdminContext()` → 403 ถ้าไม่ผ่าน
- **proxy.js** — refresh session ทุก request และ redirect `/login` ถ้าเข้าหน้า `(app)` โดยไม่มี session

---

## การคำนวณสุขภาพ (`src/lib/health.js`)

| สูตร | วิธี |
|------|------|
| **BMR** | Mifflin–St Jeor: `10W + 6.25H - 5A ± 5/161` |
| **TDEE** | BMR × activity factor (1.2 – 1.9) |
| **Goal kcal** | TDEE ± 500 (ลด/คง/เพิ่ม) |
| **BMI** | W / H² (เกณฑ์เอเชีย: ปกติ < 23) |
| **มาโคร** | P:C:F = 30:40:30 ของแคลเป้าหมาย |
| **% ไขมัน** | US Navy Formula (เอว + คอ + สะโพก + ส่วนสูง) |
| **estimateMacros** | คำนวณจากแคล + หมวดอาหาร โดยไม่ใช้ AI |

---

## ข้อจำกัดของ Gemini API (ฟรีเทียร์)

Gemini ฟรีมีโควต้าประมาณ **~20 ครั้ง/วัน/โมเดล** — แอปออกแบบให้ประหยัดโควต้า:

- **บทความสุขภาพ** — สร้างวันละ 1 ครั้ง แชร์กันทุกผู้ใช้ (เก็บใน DB)
- **ประมาณมาโคร** — ใช้ `estimateMacros()` (ฟรี, ไม่ใช้ AI) เป็นค่าตั้งต้น
- **AI ปรับมาโคร** — เรียกเฉพาะเมื่อผู้ใช้กดปุ่ม "ปรับด้วย AI" ทีละรายการ
- **Fallback** — ทุก API ที่เรียก AI มี fallback ไม่พังเมื่อ 429/503

---

## หน้าแอปพลิเคชัน

| เส้นทาง | หน้า |
|---------|------|
| `/` | Landing page (สาธารณะ) |
| `/login` | เข้าสู่ระบบ |
| `/register` | สมัครสมาชิก |
| `/home` | แดชบอร์ด: วงแหวนแคลวันนี้ + เมนูแนะนำ + บทความ AI |
| `/calculate` | คำนวณ TDEE/BMR/BMI + ตั้งเป้าหมายแคล/มาโคร |
| `/menu` | ฐานเมนูอาหาร (ค้นหา/กรอง/จัดการ) |
| `/planner` | วางแผนมื้ออาหาร 4 มื้อ/วัน |
| `/delivery` | ร้านเดลิเวอรีใกล้บ้าน (Wongnai) |
| `/weight` | บันทึกน้ำหนัก + กราฟ + คำนวณ % ไขมัน |
| `/history` | กราฟแคลย้อนหลัง + รายวัน + เมนูโปรด |
| `/profile` | โปรไฟล์ผู้ใช้ |
| `/profile/edit` | แก้ไขข้อมูลตัวตน |
| `/admin` | แดชบอร์ดแอดมิน (เฉพาะ admin) |

---

## License

โปรเจคนี้พัฒนาเพื่อการศึกษา (ภาคนิพนธ์) และไม่มี license เปิดเผยในปัจจุบัน
