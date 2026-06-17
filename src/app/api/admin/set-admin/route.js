// API: ตั้ง/ถอนสิทธิ์แอดมินให้สมาชิก (เฉพาะแอดมินเท่านั้น)
import { NextResponse } from "next/server";
import { getAdminContext, ADMIN_EMAIL } from "@/lib/adminAuth";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  if (!SUPA || !SVC) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า service role" }, { status: 500 });
  }
  const { user, isAdmin } = await getAdminContext();
  if (!isAdmin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ (เฉพาะแอดมิน)" }, { status: 403 });
  }

  let userId, makeAdmin;
  try {
    ({ userId, makeAdmin } = await request.json());
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  if (!userId || typeof makeAdmin !== "boolean") {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }
  if (userId === user.id) {
    return NextResponse.json({ error: "เปลี่ยนสิทธิ์ของตัวเองไม่ได้" }, { status: 400 });
  }

  const headers = { apikey: SVC, Authorization: `Bearer ${SVC}` };

  // กันถอนสิทธิ์บัญชีแอดมินหลัก (admin@nce.com)
  const uRes = await fetch(`${SUPA}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    headers,
  });
  if (uRes.ok) {
    const target = await uRes.json();
    if (target?.email === ADMIN_EMAIL && !makeAdmin) {
      return NextResponse.json(
        { error: "ถอนสิทธิ์บัญชีแอดมินหลักไม่ได้" },
        { status: 400 }
      );
    }
  }

  const res = await fetch(`${SUPA}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ is_admin: makeAdmin }),
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: "อัปเดตสิทธิ์ไม่สำเร็จ " + (await res.text()) },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, userId, is_admin: makeAdmin });
}
