// API: บทความสุขภาพรายวัน — AI สร้างวันละ 1 บทความ (แชร์ทุกคน), เก็บไม่เกิน 60 วัน
import { NextResponse } from "next/server";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// คลังบทความสำรอง (ใช้เมื่อ AI โควต้าหมด) — สลับตามวันไม่ให้ซ้ำเร็ว
const FALLBACK = [
  { title: "ดื่มน้ำให้พอ ช่วยเผาผลาญดีขึ้น", excerpt: "ร่างกายคนเรามีน้ำเป็นองค์ประกอบกว่า 60% การดื่มน้ำ 6–8 แก้วต่อวันช่วยระบบเผาผลาญ ลดอาการหิวหลอก และทำให้สมองปลอดโปร่ง", tag: "สุขภาพ", emoji: "💧" },
  { title: "โปรตีนสำคัญกว่าที่คิด", excerpt: "โปรตีนช่วยซ่อมแซมกล้ามเนื้อและทำให้อิ่มนาน ควรกินให้ได้ราว 1–1.5 กรัมต่อน้ำหนักตัว 1 กิโลกรัมต่อวัน เลือกไก่ ไข่ ปลา หรือเต้าหู้", tag: "โภชนาการ", emoji: "🍗" },
  { title: "กินช้าลง อิ่มเร็วขึ้น", excerpt: "สมองใช้เวลาประมาณ 20 นาทีกว่าจะรับรู้ว่าอิ่ม การเคี้ยวช้าๆ ช่วยให้กินน้อยลงโดยไม่รู้สึกอด และดีต่อระบบย่อยอาหาร", tag: "พฤติกรรม", emoji: "🍽️" },
  { title: "ผักหลากสี ดีต่อร่างกาย", excerpt: "ผักผลไม้แต่ละสีให้สารต้านอนุมูลอิสระต่างกัน ลองกินให้ครบสีในแต่ละสัปดาห์ เพื่อให้ได้วิตามินและกากใยที่หลากหลาย", tag: "โภชนาการ", emoji: "🥦" },
  { title: "นอนพอ ช่วยคุมน้ำหนัก", excerpt: "การอดนอนทำให้ฮอร์โมนหิว (ghrelin) สูงขึ้นและฮอร์โมนอิ่ม (leptin) ลดลง ทำให้อยากอาหารมากขึ้น นอนให้ได้ 7–8 ชั่วโมงต่อคืน", tag: "สุขภาพ", emoji: "😴" },
  { title: "ของทอดกินได้ แต่พอดี", excerpt: "อาหารทอดให้พลังงานสูงจากน้ำมัน ไม่ต้องงดเด็ดขาด แต่ควรจำกัดและสลับวิธีปรุงเป็นต้ม นึ่ง ย่าง เพื่อลดไขมันส่วนเกิน", tag: "โภชนาการ", emoji: "🍤" },
  { title: "เดินวันละ 30 นาที ก็ได้ผล", excerpt: "ไม่ต้องออกกำลังหนักก็สุขภาพดีได้ การเดินเร็ววันละ 30 นาทีช่วยเผาผลาญ ลดความเครียด และดีต่อหัวใจ", tag: "ออกกำลังกาย", emoji: "🚶" },
  { title: "น้ำตาลแฝงในเครื่องดื่ม", excerpt: "ชานมไข่มุกหรือน้ำอัดลม 1 แก้วอาจมีน้ำตาลเกิน 10 ช้อนชา ลองเปลี่ยนเป็นหวานน้อยหรือน้ำเปล่า ช่วยลดแคลได้มากโดยไม่อด", tag: "โภชนาการ", emoji: "🧋" },
  { title: "มื้อเช้าช่วยตั้งต้นวันได้ดี", excerpt: "มื้อเช้าที่มีโปรตีนและกากใยช่วยให้อิ่มถึงเที่ยง ลดการกินจุบจิบ เลือกไข่ ข้าวโอ๊ต หรือโยเกิร์ตกับผลไม้", tag: "พฤติกรรม", emoji: "🌅" },
  { title: "อ่านฉลากโภชนาการให้เป็น", excerpt: "ดูที่ 'หนึ่งหน่วยบริโภค' และจำนวนหน่วยต่อซอง บางทีพลังงานที่เห็นเป็นแค่ครึ่งซอง การอ่านฉลากช่วยคุมแคลได้แม่นขึ้น", tag: "สุขภาพ", emoji: "🏷️" },
];

const pad = (n) => String(n).padStart(2, "0");
function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n, 12);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
function dayIndex(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

async function aiArticle(recentTitles) {
  const avoid = recentTitles.length
    ? `หลีกเลี่ยงหัวข้อที่ซ้ำกับนี้: ${recentTitles.join(" / ")}. `
    : "";
  const prompt =
    `เขียนบทความสุขภาพ/โภชนาการสั้นๆ ภาษาไทย 1 ชิ้น สำหรับคนทั่วไปที่อยากดูแลน้ำหนักและกินดีขึ้น ` +
    avoid +
    `ตอบเป็น JSON เท่านั้น {"title":"<พาดหัวน่าสนใจ ไม่เกิน 40 ตัวอักษร>","excerpt":"<เนื้อหา 2-3 ประโยค ให้ความรู้ที่นำไปใช้ได้จริง>","tag":"<หมวดสั้นๆ เช่น โภชนาการ/สุขภาพ/ออกกำลังกาย/พฤติกรรม>","emoji":"<อิโมจิ 1 ตัว>"} ห้ามมีข้อความอื่น`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
      }),
    }
  );
  if (!res.ok) throw new Error("gemini " + res.status);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    obj = m ? JSON.parse(m[0]) : null;
  }
  if (!obj?.title || !obj?.excerpt) throw new Error("bad format");
  return {
    title: String(obj.title).slice(0, 120),
    excerpt: String(obj.excerpt).slice(0, 600),
    tag: String(obj.tag || "สุขภาพ").slice(0, 30),
    emoji: String(obj.emoji || "🥗").slice(0, 8),
  };
}

const H = () => ({ apikey: SVC, Authorization: `Bearer ${SVC}` });

export async function GET(request) {
  if (!SUPA || !SVC) {
    return NextResponse.json({ articles: [], error: "no service role" }, { status: 200 });
  }
  const today =
    new URL(request.url).searchParams.get("date") ||
    new Date().toISOString().slice(0, 10); // เผื่อ client ไม่ส่งวันมา (ใช้ UTC)
  const cutoff = addDays(today, -60);

  // 1) ลบบทความที่เกิน 60 วัน
  await fetch(`${SUPA}/rest/v1/health_articles?article_date=lt.${cutoff}`, {
    method: "DELETE",
    headers: H(),
  }).catch(() => {});

  // 2) มีบทความของวันนี้แล้วหรือยัง
  const existRes = await fetch(
    `${SUPA}/rest/v1/health_articles?select=id&article_date=eq.${today}`,
    { headers: H() }
  );
  const exist = existRes.ok ? await existRes.json() : [];

  // 3) ถ้ายังไม่มี → สร้างใหม่ (AI ก่อน ถ้าไม่ได้ใช้คลังสำรอง)
  if (!exist.length) {
    let article = null;
    if (GEMINI_KEY) {
      try {
        const recentRes = await fetch(
          `${SUPA}/rest/v1/health_articles?select=title&order=article_date.desc&limit=7`,
          { headers: H() }
        );
        const recent = recentRes.ok ? await recentRes.json() : [];
        article = await aiArticle(recent.map((r) => r.title));
      } catch {
        article = null;
      }
    }
    if (!article) {
      article = FALLBACK[dayIndex(today) % FALLBACK.length];
    }
    // insert (ถ้าชนกัน = มีคนสร้างไปแล้วพร้อมกัน ก็ข้าม)
    await fetch(`${SUPA}/rest/v1/health_articles`, {
      method: "POST",
      headers: { ...H(), "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({ article_date: today, ...article }),
    }).catch(() => {});
  }

  // 4) คืนบทความล่าสุด (ไม่เกิน 60 วัน)
  const listRes = await fetch(
    `${SUPA}/rest/v1/health_articles?select=id,article_date,title,excerpt,tag,emoji&order=article_date.desc&limit=30`,
    { headers: H() }
  );
  const articles = listRes.ok ? await listRes.json() : [];

  return NextResponse.json(
    { articles },
    { headers: { "content-type": "application/json; charset=utf-8" } }
  );
}
