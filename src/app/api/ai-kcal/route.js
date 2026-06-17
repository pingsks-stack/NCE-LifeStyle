// API: ใช้ Google Gemini (ฟรี) ประเมินแคลอรี่ + ปริมาณ/หน่วยเสิร์ฟ ของเมนู (admin)
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ADMIN_EMAIL = "admin@nce.com";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callModel(model, prompt) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    }
  );
}

async function askGemini(name) {
  const prompt =
    `ประเมินคุณค่าทางโภชนาการของเมนูอาหาร "${name}" ต่อ 1 หน่วยเสิร์ฟทั่วไป ` +
    `ตอบเป็น JSON เท่านั้น รูปแบบ {"kcal": <จำนวนเต็มแคลอรี่>, "portion": "<ปริมาณ/หน่วยเสิร์ฟสั้นๆ ภาษาไทย เช่น 1 จาน (~350 กรัม)>", "protein_g": <กรัมโปรตีน>, "carb_g": <กรัมคาร์โบไฮเดรต>, "fat_g": <กรัมไขมัน>} ` +
    `โดยพลังงานจากมาโครควรสอดคล้องกับ kcal (โปรตีน 4, คาร์บ 4, ไขมัน 9 แคล/กรัม) ห้ามมีข้อความอื่น`;

  // ลองหลายโมเดล + retry เมื่อโมเดลโหลดเยอะ (503)
  const models = [...new Set([MODEL, "gemini-2.5-flash-lite", "gemini-flash-latest"])];
  let lastErr = "";
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      let res;
      try {
        res = await callModel(model, prompt);
      } catch {
        lastErr = "หมดเวลา";
        continue;
      }
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        let obj;
        try {
          obj = JSON.parse(text);
        } catch {
          const m = text.match(/\{[\s\S]*\}/);
          obj = m ? JSON.parse(m[0]) : null;
        }
        if (obj && typeof obj.kcal !== "undefined") {
          const macro = (v) => {
            const n = Math.round((Number(v) || 0) * 10) / 10;
            return n > 0 ? n : 0;
          };
          return {
            kcal: Math.round(Number(obj.kcal)) || 0,
            portion: String(obj.portion || ""),
            protein_g: macro(obj.protein_g),
            carb_g: macro(obj.carb_g),
            fat_g: macro(obj.fat_g),
          };
        }
        lastErr = "AI ตอบไม่ถูกรูปแบบ";
        break; // เปลี่ยนโมเดล
      }
      lastErr = "gemini " + res.status;
      if (res.status === 503) {
        await sleep(900); // โหลดเยอะ — รอแล้วลองใหม่
        continue;
      }
      break; // 429/404/อื่นๆ → เปลี่ยนโมเดล
    }
  }
  throw new Error(lastErr || "เรียก AI ไม่สำเร็จ");
}

export async function POST(request) {
  if (!SUPA || !SVC) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า service role" }, { status: 500 });
  }
  if (!GEMINI_KEY) {
    return NextResponse.json(
      { error: "ยังไม่ได้ใส่ GEMINI_API_KEY ใน .env.local" },
      { status: 500 }
    );
  }

  let id, name;
  try {
    ({ id, name } = await request.json());
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  if (!id || !name) return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });

  // ตรวจสิทธิ์แอดมิน
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ (เฉพาะแอดมิน)" }, { status: 403 });
  }

  let result;
  try {
    result = await askGemini(name);
  } catch (e) {
    return NextResponse.json({ error: "AI ใช้งานไม่ได้: " + String(e.message || e) }, { status: 502 });
  }

  // บันทึก kcal + portion
  const up = await fetch(`${SUPA}/rest/v1/foods?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      kcal: result.kcal,
      portion: result.portion,
      protein_g: result.protein_g,
      carb_g: result.carb_g,
      fat_g: result.fat_g,
    }),
  });
  if (!up.ok) {
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 502 });
  }

  return NextResponse.json(result, {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
