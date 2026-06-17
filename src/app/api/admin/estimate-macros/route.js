// API: เติมมาโครแบบประมาณ (จากแคล+หมวดอาหาร) ให้เมนูที่ยังไม่มีค่า — ฟรี ไม่ใช้ AI
import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminAuth";
import { estimateMacros } from "@/lib/health";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST() {
  if (!SUPA || !SVC) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า service role" }, { status: 500 });
  }
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ (เฉพาะแอดมิน)" }, { status: 403 });
  }

  const headers = { apikey: SVC, Authorization: `Bearer ${SVC}` };

  // เมนูที่ยังไม่มีมาโครครบ
  const listRes = await fetch(
    `${SUPA}/rest/v1/foods?select=id,kcal,category&or=(protein_g.is.null,carb_g.is.null,fat_g.is.null)`,
    { headers }
  );
  if (!listRes.ok) {
    const detail = await listRes.text();
    const hint = detail.includes("protein_g")
      ? " — ยังไม่ได้รัน supabase/08-food-macros.sql (ตาราง foods ยังไม่มีคอลัมน์มาโคร)"
      : "";
    return NextResponse.json(
      { error: "ดึงรายการเมนูไม่สำเร็จ" + hint, detail },
      { status: 502 }
    );
  }
  const rows = await listRes.json();
  if (!rows.length) return NextResponse.json({ updated: 0 });

  // อัปเดตทีละชุด (ชุดละ 25 พร้อมกัน) กันยิงพร้อมกันเยอะเกิน
  let updated = 0;
  const chunk = 25;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk);
    const results = await Promise.all(
      batch.map((f) => {
        const m = estimateMacros(f.kcal, f.category);
        return fetch(`${SUPA}/rest/v1/foods?id=eq.${f.id}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(m),
        }).then((r) => r.ok);
      })
    );
    updated += results.filter(Boolean).length;
  }

  return NextResponse.json({ updated, total: rows.length });
}
