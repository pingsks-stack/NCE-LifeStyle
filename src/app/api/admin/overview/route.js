// API: สถิติรวมสำหรับแดชบอร์ดแอดมิน (ใช้ service_role อ่านข้ามผู้ใช้)
import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminAuth";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

// นับจำนวนแถวด้วย Content-Range ของ PostgREST (Prefer: count=exact)
async function countOf(path) {
  const res = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: {
      apikey: SVC,
      Authorization: `Bearer ${SVC}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  const cr = res.headers.get("content-range") || "";
  return Number(cr.split("/")[1]) || 0;
}

export async function GET(request) {
  if (!SUPA || !SVC) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า service role" }, { status: 500 });
  }
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ (เฉพาะแอดมิน)" }, { status: 403 });
  }

  const date = new URL(request.url).searchParams.get("date") || "";

  const [foods, foodsNoMacro, foodsNoImage, users, admins, mealsToday] = await Promise.all([
    countOf("foods?select=id"),
    countOf("foods?select=id&protein_g=is.null"),
    countOf("foods?select=id&image_url=is.null"),
    countOf("profiles?select=id"),
    countOf("profiles?select=id&is_admin=is.true"),
    date ? countOf(`meal_entries?select=id&eat_date=eq.${date}`) : Promise.resolve(0),
  ]);

  return NextResponse.json({
    foods,
    foodsNoMacro,
    foodsNoImage,
    users,
    admins,
    mealsToday,
  });
}
