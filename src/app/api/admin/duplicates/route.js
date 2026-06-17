// API: ตรวจหาเมนูที่ชื่อ "ซ้ำ/คล้ายกัน" (ตัดวงเล็บ/ช่องว่างออกแล้วเทียบ) สำหรับแอดมิน
import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminAuth";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

// normalize: ตัดข้อความในวงเล็บ + ช่องว่าง แล้วเทียบตัวพิมพ์เล็ก
function norm(name) {
  return (name || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

export async function GET() {
  if (!SUPA || !SVC) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า service role" }, { status: 500 });
  }
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ (เฉพาะแอดมิน)" }, { status: 403 });
  }

  const res = await fetch(
    `${SUPA}/rest/v1/foods?select=id,name,kcal,category,cuisine,image_url&order=name`,
    { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } }
  );
  if (!res.ok) {
    return NextResponse.json({ error: "ดึงข้อมูลเมนูไม่สำเร็จ" }, { status: 502 });
  }
  const foods = await res.json();

  const map = {};
  for (const f of foods) {
    const k = norm(f.name);
    if (!k) continue;
    (map[k] = map[k] || []).push(f);
  }
  const groups = Object.values(map)
    .filter((items) => items.length > 1)
    // เมนูที่มีรูป/แคลครบ มาก่อน (ไว้เก็บตัวที่สมบูรณ์)
    .map((items) => ({
      items: items.sort((a, b) => (b.image_url ? 1 : 0) - (a.image_url ? 1 : 0)),
    }))
    .sort((a, b) => b.items.length - a.items.length);

  return NextResponse.json(
    { groups, count: groups.length },
    { headers: { "content-type": "application/json; charset=utf-8" } }
  );
}
