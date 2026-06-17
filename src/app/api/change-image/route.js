// API: เปลี่ยนรูปเมนูรายอัน (admin) — หยิบรูปถัดไปจาก Bing ที่โหลดได้ แล้วบันทึก
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = "admin@nce.com";

async function imageWorks(url, origin) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Referer: origin, Range: "bytes=0-2047" },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!(res.ok || res.status === 206)) return false;
    return (res.headers.get("content-type") || "").startsWith("image/");
  } catch {
    return false;
  }
}

async function bingImages(name) {
  try {
    const res = await fetch(
      `https://www.bing.com/images/search?q=${encodeURIComponent(name)}&form=HDRSC2`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(9000), cache: "no-store" }
    );
    if (!res.ok) return [];
    const html = new TextDecoder("utf-8").decode(await res.arrayBuffer());
    return [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)]
      .map((m) => m[1].replace(/&amp;/g, "&"))
      .filter((u) => /^https:\/\/.+\.(jpg|jpeg|png|webp)/i.test(u));
  } catch {
    return [];
  }
}

export async function POST(request) {
  if (!SUPA || !SVC) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า service role" }, { status: 500 });
  }

  let id, name, current;
  try {
    ({ id, name, current } = await request.json());
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  if (!id || !name) return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });

  // ตรวจสิทธิ์แอดมินจาก session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ (เฉพาะแอดมิน)" }, { status: 403 });
  }

  const origin = request.nextUrl.origin;
  const murls = await bingImages(name);
  if (murls.length === 0) {
    return NextResponse.json({ error: "หารูปไม่เจอ" }, { status: 404 });
  }

  // เริ่มหาจากตำแหน่ง "ถัดจากรูปปัจจุบัน" แล้ววนหารูปถัดไปที่โหลดได้
  const cur = murls.indexOf(current);
  const start = cur >= 0 ? cur + 1 : 0;
  let picked = null;
  for (let i = 0; i < murls.length; i++) {
    const cand = murls[(start + i) % murls.length];
    if (cand === current) continue;
    if (await imageWorks(cand, origin)) {
      picked = cand;
      break;
    }
  }
  if (!picked) return NextResponse.json({ error: "ไม่มีรูปอื่นที่ใช้ได้" }, { status: 404 });

  const up = await fetch(`${SUPA}/rest/v1/foods?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: picked }),
  });
  if (!up.ok) {
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 502 });
  }

  return NextResponse.json(
    { url: picked },
    { headers: { "content-type": "application/json; charset=utf-8" } }
  );
}
