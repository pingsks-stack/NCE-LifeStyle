// API: แก้ไขเมนู (admin) — ตรวจ session แอดมิน แล้ว PATCH ผ่าน service_role
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = "admin@nce.com";

export async function POST(request) {
  if (!SUPA || !SVC) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า service role" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const { id, name, kcal, category, cuisine, image_url, portion, protein_g, carb_g, fat_g } = body;
  if (!id) return NextResponse.json({ error: "ไม่พบ id" }, { status: 400 });

  // ตรวจสิทธิ์แอดมิน
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ (เฉพาะแอดมิน)" }, { status: 403 });
  }

  // ประกอบเฉพาะฟิลด์ที่ส่งมา
  const patch = {};
  if (typeof name === "string" && name.trim()) patch.name = name.trim();
  if (kcal !== undefined && kcal !== null && !isNaN(Number(kcal))) patch.kcal = Number(kcal);
  if (typeof category === "string") patch.category = category;
  if (typeof cuisine === "string") patch.cuisine = cuisine;
  if (typeof image_url === "string") patch.image_url = image_url.trim() || null;
  if (typeof portion === "string") patch.portion = portion.trim() || null;
  const macro = (v) => (v === "" || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));
  if (protein_g !== undefined) patch.protein_g = macro(protein_g);
  if (carb_g !== undefined) patch.carb_g = macro(carb_g);
  if (fat_g !== undefined) patch.fat_g = macro(fat_g);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "ไม่มีข้อมูลให้แก้ไข" }, { status: 400 });
  }

  const res = await fetch(`${SUPA}/rest/v1/foods?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      apikey: SVC,
      Authorization: `Bearer ${SVC}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ " + (await res.text()) }, { status: 502 });
  }
  const rows = await res.json();
  return NextResponse.json(
    { food: rows[0] || null },
    { headers: { "content-type": "application/json; charset=utf-8" } }
  );
}
