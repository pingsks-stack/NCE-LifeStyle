// API (dev): ตรวจรูปเมนูที่โหลดไม่ได้ แล้วเปลี่ยนเป็น "รูปถัดไป" ที่โหลดได้จาก Bing
// เรียกซ้ำด้วย ?offset= ทีละชุดจนครบ
import { NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

// เช็คว่ารูปโหลดได้จริงไหม (จำลอง referer แบบ browser จากเว็บเรา)
async function imageWorks(url, origin) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": UA, Referer: origin, Range: "bytes=0-2047" },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!(res.ok || res.status === 206)) return false;
    const ct = res.headers.get("content-type") || "";
    return ct.startsWith("image/");
  } catch {
    return false;
  }
}

// ค้น Bing → คืนรายการ url รูป (เรียงตามอันดับ)
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

export async function GET(request) {
  if (!SUPA || !SVC) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า service role" }, { status: 500 });
  }
  const origin = request.nextUrl.origin;
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 10, 15);
  const offset = Number(request.nextUrl.searchParams.get("offset")) || 0;
  const svcH = { apikey: SVC, Authorization: `Bearer ${SVC}` };

  const res = await fetch(
    `${SUPA}/rest/v1/foods?select=id,name,image_url&order=id&limit=${limit}&offset=${offset}`,
    { headers: svcH, cache: "no-store" }
  );
  const foods = await res.json();

  let fixed = 0;
  let stillBad = 0;
  await Promise.all(
    foods.map(async (f) => {
      // รูปปัจจุบันใช้ได้อยู่แล้ว → ข้าม
      if (f.image_url && (await imageWorks(f.image_url, origin))) return;

      // หารูปถัดไปที่โหลดได้
      const candidates = await bingImages(f.name);
      let picked = null;
      for (const url of candidates) {
        if (url === f.image_url) continue;
        if (await imageWorks(url, origin)) {
          picked = url;
          break;
        }
      }
      await fetch(`${SUPA}/rest/v1/foods?id=eq.${f.id}`, {
        method: "PATCH",
        headers: { ...svcH, "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: picked }),
      });
      if (picked) fixed++;
      else stillBad++;
    })
  );

  return NextResponse.json({
    processed: foods.length,
    fixed,
    stillBad,
    nextOffset: offset + foods.length,
    hasMore: foods.length === limit,
  });
}
