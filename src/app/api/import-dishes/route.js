// API (dev): ดึงชื่อเมนูจาก "เมนูแนะนำโดยสมาชิก" ของร้านบน Wongnai
// แล้วเดาแคล/หมวดจากชื่อ → เพิ่มเข้าตาราง foods (ผ่าน service_role ฝั่ง server)
// หมายเหตุ: แคลเป็นค่าประมาณจากชื่อ — แอดมินแก้ทีหลังได้
import { NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

// เดาแคลจากชื่อเมนู (ค่าประมาณ)
function guessKcal(n) {
  if (/ยำ|สลัด|ส้มตำ|น้ำพริก/.test(n)) return 190;
  if (/ข้าวผัด|ข้าวมัน|ข้าวขา|ข้าวคลุก|ข้าวหมู/.test(n)) return 520;
  if (/ก๋วยเตี๋ยว|บะหมี่|ราดหน้า|ผัดไทย|ผัดซีอิ๊ว|เส้น|สปาเกตตี/.test(n)) return 420;
  if (/ต้ม|แกง|ซุป|โจ๊ก/.test(n)) return 290;
  if (/เค้ก|ไอศก|ขนม|หวาน|วาฟเฟิล|โรตี|บิงซู/.test(n)) return 320;
  if (/ชา|กาแฟ|นม|น้ำ|cocktail|smoothie|ปั่น|โซดา/i.test(n)) return 180;
  if (/ทอด|ปิ้ง|ย่าง|ผัด/.test(n)) return 400;
  if (/ข้าว/.test(n)) return 460;
  return 350;
}
function guessCategory(n) {
  if (/ยำ|สลัด|ส้มตำ|คลีน/.test(n)) return "สลัด/คลีน";
  if (/ก๋วยเตี๋ยว|บะหมี่|ราดหน้า|ผัดไทย|เส้น|สปาเกตตี/.test(n)) return "เส้น";
  if (/ต้ม|แกง|ซุป|โจ๊ก/.test(n)) return "แกง/ต้ม";
  if (/เค้ก|ไอศก|ขนม|หวาน|วาฟเฟิล|โรตี|บิงซู/.test(n)) return "ของหวาน";
  if (/ชา|กาแฟ|นม|น้ำ|cocktail|smoothie|ปั่น|โซดา/i.test(n)) return "เครื่องดื่ม";
  if (/ข้าว/.test(n)) return "จานข้าว";
  return "ทานเล่น";
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "th,en;q=0.9" },
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return new TextDecoder("utf-8").decode(await res.arrayBuffer());
}

function dishesFromShop(html) {
  const out = [];
  const re = /<a[^>]*href="[^"]*menu\/items\/\d+"[^>]*>(.*?)<\/a>/gs;
  let m;
  while ((m = re.exec(html))) {
    const txt = m[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\s*\d*\s*฿[\d,]+.*$/, "") // ตัด "<จำนวน> ฿ราคา ..." ท้าย
      .replace(/\s+\d+\s*$/, "") // ตัดเลขนับท้าย (เผื่อไม่มีราคา)
      .trim();
    if (txt && txt.length <= 40) out.push(txt);
  }
  return out;
}

export async function GET(request) {
  const sp = request.nextUrl.searchParams;
  const lat = sp.get("lat") || "13.7563";
  const lng = sp.get("lng") || "100.5018";
  const q = sp.get("q") || "";

  if (!SUPA || !SVC) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า service role key" }, { status: 500 });
  }

  try {
    // 1) ดึง list ร้าน
    const listUrl =
      `https://www.wongnai.com/restaurants?features.delivery=1&rerank=true` +
      `&latitude=${lat}&longitude=${lng}` + (q ? `&q=${encodeURIComponent(q)}` : "");
    const listHtml = await fetchText(listUrl);
    if (!listHtml) return NextResponse.json({ error: "โหลด list ไม่ได้" }, { status: 502 });

    const scripts = [...listHtml.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
    let urls = [];
    for (const s of scripts) {
      try {
        const d = JSON.parse(s[1].trim());
        if (d["@type"] === "ItemList") {
          urls = d.itemListElement.map((x) => (x.url || "").split("?")[0]).filter(Boolean).slice(0, 6);
          break;
        }
      } catch {}
    }

    // 2) ดึงเมนูจากแต่ละร้าน (ขนาน)
    const pages = await Promise.all(urls.map((u) => fetchText(u).catch(() => null)));
    const names = [...new Set(pages.filter(Boolean).flatMap(dishesFromShop))];

    if (names.length === 0) {
      return NextResponse.json({ added: 0, names: [], note: "ไม่พบเมนูในร้านแถวนี้" });
    }

    // 3) เช็คชื่อที่มีอยู่แล้ว (กันซ้ำ)
    const existRes = await fetch(`${SUPA}/rest/v1/foods?select=name`, {
      headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
      cache: "no-store",
    });
    const existing = new Set((await existRes.json()).map((f) => f.name));
    const fresh = names.filter((n) => !existing.has(n));

    if (fresh.length === 0) {
      return NextResponse.json({ added: 0, names: [], note: "เมนูที่เจอมีอยู่แล้วทั้งหมด" });
    }

    // 4) เพิ่มเข้า foods
    const rows = fresh.map((name) => ({
      name,
      kcal: guessKcal(name),
      category: guessCategory(name),
      emoji: "🍴",
    }));
    const ins = await fetch(`${SUPA}/rest/v1/foods`, {
      method: "POST",
      headers: {
        apikey: SVC,
        Authorization: `Bearer ${SVC}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rows),
    });
    if (!ins.ok) {
      return NextResponse.json({ error: "insert ไม่สำเร็จ " + (await ins.text()) }, { status: 502 });
    }

    return NextResponse.json(
      { added: fresh.length, names: fresh },
      { headers: { "content-type": "application/json; charset=utf-8" } }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
