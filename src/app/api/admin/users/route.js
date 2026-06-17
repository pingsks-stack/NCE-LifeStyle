// API: รายชื่อสมาชิกทั้งหมด (อีเมลจาก Auth Admin API + ข้อมูลจาก profiles)
import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminAuth";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  if (!SUPA || !SVC) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า service role" }, { status: 500 });
  }
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ (เฉพาะแอดมิน)" }, { status: 403 });
  }

  const headers = { apikey: SVC, Authorization: `Bearer ${SVC}` };

  const [authRes, profRes] = await Promise.all([
    fetch(`${SUPA}/auth/v1/admin/users?per_page=200`, { headers }),
    fetch(`${SUPA}/rest/v1/profiles?select=id,username,full_name,is_admin,daily_goal_kcal`, {
      headers,
    }),
  ]);

  if (!authRes.ok) {
    return NextResponse.json({ error: "ดึงรายชื่อผู้ใช้ไม่สำเร็จ" }, { status: 502 });
  }

  const authData = await authRes.json();
  const profs = profRes.ok ? await profRes.json() : [];
  const map = Object.fromEntries((profs || []).map((p) => [p.id, p]));

  const users = (authData.users || []).map((u) => {
    const p = map[u.id] || {};
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      username: p.username || null,
      full_name: p.full_name || null,
      is_admin: !!p.is_admin,
      daily_goal_kcal: p.daily_goal_kcal ?? null,
    };
  });
  // เรียงแอดมินขึ้นก่อน แล้วตามวันที่สมัครใหม่สุด
  users.sort((a, b) => {
    if (a.is_admin !== b.is_admin) return a.is_admin ? -1 : 1;
    return (b.created_at || "").localeCompare(a.created_at || "");
  });

  return NextResponse.json(
    { users },
    { headers: { "content-type": "application/json; charset=utf-8" } }
  );
}
