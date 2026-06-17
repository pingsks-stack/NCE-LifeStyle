// API (dev): ดึงชื่อเมนูอาหารไทยจาก Wikipedia (หลายหมวดหมู่) → เดาแคล/หมวด → เพิ่มเข้า foods
import { NextResponse } from "next/server";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

// หมวดหมู่อาหารไทยใน Wikipedia ภาษาไทย
const CATS = [
  "หมวดหมู่:อาหารไทย",
  "หมวดหมู่:อาหารไทยภาคอีสาน",
  "หมวดหมู่:อาหารไทยภาคใต้",
  "หมวดหมู่:อาหารไทยภาคเหนือ",
  "หมวดหมู่:อาหารไทยภาคกลาง",
  "หมวดหมู่:ขนมไทย",
  "หมวดหมู่:ก๋วยเตี๋ยว",
  "หมวดหมู่:แกง",
];

// ตัดรายการที่ไม่ใช่ชื่อเมนู
function isDish(t) {
  if (!t || t.length > 30) return false;
  if (t.includes(":")) return false; // หมวดหมู่/หน้าพิเศษ
  if (/^(รายการ|อาหาร|วัฒนธรรม|ประวัติ|ภัตตาคาร|ร้านอาหาร)/.test(t)) return false;
  return true;
}

function guessKcal(n) {
  if (/ยำ|สลัด|ส้มตำ|น้ำพริก|พล่า/.test(n)) return 190;
  if (/ข้าวผัด|ข้าวมัน|ข้าวขา|ข้าวคลุก|ข้าวหมู|ข้าวหน้า/.test(n)) return 520;
  if (/ก๋วยเตี๋ยว|บะหมี่|ราดหน้า|ผัดไทย|ผัดซีอิ๊ว|เส้น|ขนมจีน|หมี่/.test(n)) return 420;
  if (/ต้ม|แกง|ซุป|โจ๊ก|ต้มยำ/.test(n)) return 290;
  if (/ขนม|ไอศก|หวาน|วุ้น|บัวลอย|ทองหยอด|ฝอยทอง|ลอดช่อง/.test(n)) return 250;
  if (/ทอด|ปิ้ง|ย่าง|ผัด|เจียว/.test(n)) return 400;
  if (/ข้าว/.test(n)) return 460;
  return 320;
}
function guessCategory(n) {
  if (/ยำ|สลัด|ส้มตำ|น้ำพริก|พล่า/.test(n)) return "ยำ/น้ำพริก";
  if (/ก๋วยเตี๋ยว|บะหมี่|ราดหน้า|ผัดไทย|เส้น|ขนมจีน|หมี่/.test(n)) return "เส้น";
  if (/ต้ม|แกง|ซุป|โจ๊ก/.test(n)) return "แกง/ต้ม";
  if (/ขนม|ไอศก|หวาน|วุ้น|บัวลอย|ทองหยอด|ฝอยทอง|ลอดช่อง/.test(n)) return "ของหวาน";
  if (/ข้าว/.test(n)) return "จานข้าว";
  return "อาหารไทย";
}

async function catMembers(cat) {
  try {
    const url = `https://th.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(cat)}&cmtype=page&cmlimit=500&format=json&origin=*`;
    const res = await fetch(url, {
      headers: { "User-Agent": "NCE-LifeStyle/1.0 (dev)" },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const d = await res.json();
    return (d.query?.categorymembers || []).map((m) => m.title);
  } catch {
    return [];
  }
}

export async function GET() {
  if (!SUPA || !SVC) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า service role" }, { status: 500 });
  }
  const svcH = { apikey: SVC, Authorization: `Bearer ${SVC}` };

  // 1) รวมชื่อจากทุกหมวด (ตัดวงเล็บแก้กำกวมท้ายชื่อออก เช่น "ข้าวผัด (ไทย)")
  const all = (await Promise.all(CATS.map(catMembers)))
    .flat()
    .map((t) => t.replace(/\s*\([^)]*\)\s*$/, "").trim());
  const names = [...new Set(all.filter(isDish))];
  if (names.length === 0) return NextResponse.json({ added: 0, names: [] });

  // 2) กันซ้ำกับที่มีอยู่
  const existRes = await fetch(`${SUPA}/rest/v1/foods?select=name`, { headers: svcH, cache: "no-store" });
  const existing = new Set((await existRes.json()).map((f) => f.name));
  const fresh = names.filter((n) => !existing.has(n));
  if (fresh.length === 0) return NextResponse.json({ added: 0, names: [], note: "มีอยู่แล้วทั้งหมด" });

  // 3) เพิ่มเข้า foods
  const rows = fresh.map((name) => ({
    name,
    kcal: guessKcal(name),
    category: guessCategory(name),
    emoji: "🍴",
  }));
  const ins = await fetch(`${SUPA}/rest/v1/foods`, {
    method: "POST",
    headers: { ...svcH, "Content-Type": "application/json" },
    body: JSON.stringify(rows),
  });
  if (!ins.ok) {
    return NextResponse.json({ error: "insert ไม่สำเร็จ " + (await ins.text()) }, { status: 502 });
  }
  return NextResponse.json(
    { added: fresh.length, names: fresh },
    { headers: { "content-type": "application/json; charset=utf-8" } }
  );
}
