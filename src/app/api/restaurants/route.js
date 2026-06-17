// API ฝั่ง server: ดึงรายชื่อร้านใกล้พิกัด จากหน้า Wongnai (เลี่ยง CORS)
// หมายเหตุ: ใช้ช่วง dev เท่านั้น — ตอน production จะย้ายไป Google Places API
import { NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

// เข้าไปดึงรูปร้าน (og:image) จากหน้าร้านแต่ละร้าน — ลดขนาดรูปให้เล็กลง
async function fetchImage(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "th,en;q=0.9" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = new TextDecoder("utf-8").decode(await res.arrayBuffer());
    const m =
      html.match(/property="og:image"\s+content="([^"]+)"/) ||
      html.match(/content="([^"]+)"\s+property="og:image"/);
    if (!m) return null;
    // เปลี่ยนขนาดรูปเป็น 400x0 (Wongnai รองรับเฉพาะรูปแบบ WIDTHx0) ให้โหลดเร็ว
    return m[1].replace(/\/p\/\d+x\d+\//, "/p/400x0/");
  } catch {
    return null;
  }
}

export async function GET(request) {
  const sp = request.nextUrl.searchParams;
  const lat = sp.get("lat");
  const lng = sp.get("lng");
  const q = sp.get("q") || "";

  if (!lat || !lng) {
    return NextResponse.json({ error: "ต้องระบุ lat/lng" }, { status: 400 });
  }

  const url =
    `https://www.wongnai.com/restaurants?features.delivery=1&rerank=true` +
    `&latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}` +
    (q ? `&q=${encodeURIComponent(q)}` : "");

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "th,en;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `wongnai ${res.status}` }, { status: 502 });
    }
    // อ่านเป็น UTF-8 ให้ชัดเจน (กันภาษาไทยเพี้ยน)
    const buf = await res.arrayBuffer();
    const html = new TextDecoder("utf-8").decode(buf);

    // ดึง JSON-LD ItemList
    const scripts = [
      ...html.matchAll(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
      ),
    ];
    let items = [];
    for (const m of scripts) {
      try {
        const d = JSON.parse(m[1].trim());
        if (d && d["@type"] === "ItemList" && Array.isArray(d.itemListElement)) {
          items = d.itemListElement;
          break;
        }
      } catch {
        // ข้าม script ที่ parse ไม่ได้
      }
    }

    const base = items
      .map((it) => {
        const u = it.url || "";
        const slugPart = decodeURIComponent(u.split("/restaurants/")[1] || "").split("?")[0];
        const name = slugPart.split("-").slice(1).join(" ").trim();
        return { position: it.position, name, url: u };
      })
      .filter((r) => r.name && r.url);

    // ดึงรูปร้านแต่ละร้านแบบขนาน (ถ้าดึงไม่ได้ image = null → หน้าเว็บจะใช้ไอคอนแทน)
    const restaurants = await Promise.all(
      base.map(async (r) => ({ ...r, image: await fetchImage(r.url) }))
    );

    return NextResponse.json(
      { restaurants },
      { headers: { "content-type": "application/json; charset=utf-8" } }
    );
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
