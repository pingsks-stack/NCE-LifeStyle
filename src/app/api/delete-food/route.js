// API: ลบเมนู (foods) — ตรวจว่าเป็นแอดมินจาก session ก่อน แล้วลบผ่าน service_role
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = "admin@nce.com";

export async function POST(request) {
  if (!SUPA || !SVC) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า service role" }, { status: 500 });
  }

  let id;
  try {
    ({ id } = await request.json());
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "ไม่พบ id" }, { status: 400 });

  // ตรวจสิทธิ์จาก session จริง
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ลบ (เฉพาะแอดมิน)" }, { status: 403 });
  }

  // ลบผ่าน service_role
  const res = await fetch(`${SUPA}/rest/v1/foods?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "ลบไม่สำเร็จ " + (await res.text()) }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
