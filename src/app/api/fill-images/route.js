// API (dev): เติมรูปให้เมนูที่ยังไม่มีรูป โดยค้นชื่อเมนูบน Wongnai → ดึง og:image ของร้านอันดับ 1
// ทำทีละชุด (batch) — เรียกซ้ำจนกว่า remaining = 0
import { NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "th,en;q=0.9" },
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return new TextDecoder("utf-8").decode(await res.arrayBuffer());
}

// ค้นชื่อเมนูบน Bing images → เอารูปแรก (top result)
async function dishImage(name) {
  try {
    const html = await fetchText(
      `https://www.bing.com/images/search?q=${encodeURIComponent(name)}&form=HDRSC2`
    );
    if (!html) return null;
    // รูปต้นฉบับเก็บใน murl (HTML-encoded) — เอาอันแรก
    const matches = [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)];
    for (const m of matches) {
      const url = m[1].replace(/&amp;/g, "&");
      if (/^https:\/\/.+\.(jpg|jpeg|png|webp)/i.test(url)) return url;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request) {
  if (!SUPA || !SVC) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า service role" }, { status: 500 });
  }
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 15, 25);
  const svcH = { apikey: SVC, Authorization: `Bearer ${SVC}` };

  // ดึงเมนูที่ยังไม่มีรูป
  const res = await fetch(
    `${SUPA}/rest/v1/foods?select=id,name&image_url=is.null&limit=${limit}`,
    { headers: svcH, cache: "no-store" }
  );
  const foods = await res.json();

  let filled = 0;
  await Promise.all(
    foods.map(async (f) => {
      const img = await dishImage(f.name);
      if (!img) return;
      const up = await fetch(`${SUPA}/rest/v1/foods?id=eq.${f.id}`, {
        method: "PATCH",
        headers: { ...svcH, "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: img }),
      });
      if (up.ok) filled++;
    })
  );

  // นับที่ยังเหลือ
  const remRes = await fetch(`${SUPA}/rest/v1/foods?select=id&image_url=is.null`, {
    headers: { ...svcH, Prefer: "count=exact", Range: "0-0" },
    cache: "no-store",
  });
  const cr = remRes.headers.get("content-range") || "";
  const remaining = Number(cr.split("/")[1]) || 0;

  return NextResponse.json({ processed: foods.length, filled, remaining });
}
