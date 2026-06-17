"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadLocation, saveLocation } from "@/lib/location";

const SLOT_LABELS = { breakfast: "เช้า", lunch: "เที่ยง", dinner: "เย็น" };

// สัญชาติอาหาร (ใช้ในฟิลเตอร์ + modal แก้ไข)
const CUISINES = [
  "อาหารไทย",
  "อาหารอีสาน/ส้มตำ",
  "อาหารเหนือ",
  "อาหารใต้",
  "อาหารจีน",
  "อาหารญี่ปุ่น",
  "อาหารเกาหลี",
  "อาหารเวียดนาม",
  "อาหารอินเดีย",
  "อาหารมุสลิม/ฮาลาล",
  "อาหารอเมริกัน",
  "อาหารอิตาเลียน",
  "อาหารฝรั่งเศส",
  "อาหารเม็กซิกัน",
  "อาหารเยอรมัน",
  "อาหารฟิวชั่น",
  "อาหารนานาชาติ",
];

const CATEGORY_OPTIONS = [
  "จานข้าว",
  "เส้น",
  "แกง/ต้ม",
  "กับข้าว",
  "ทานเล่น",
  "ยำ/น้ำพริก",
  "สลัด/คลีน",
  "ของหวาน",
  "เครื่องดื่ม",
  "เครื่องปรุง",
  "ไม่ใช่อาหาร",
  "อื่นๆ",
];

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function MenuPage() {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("ทั้งหมด");
  const [activeCuisine, setActiveCuisine] = useState("ทั้งหมด");
  const [editingFood, setEditingFood] = useState(null);
  const [foods, setFoods] = useState([]);
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState("");
  const [importing, setImporting] = useState(false);
  const [importingWiki, setImportingWiki] = useState(false);
  const [filling, setFilling] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [aiAuto, setAiAuto] = useState({ running: false, done: 0, total: 0, ok: 0, errors: 0 });
  const aiStop = useRef(false);
  const [estimating, setEstimating] = useState(false);

  async function loadFoods() {
    const { data, error } = await supabase.from("foods").select("*").order("id");
    if (error) setError(error.message);
    else setFoods(data ?? []);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setEmail(user?.email ?? "");
      await loadFoods();
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(t) {
    setToast(t);
    setTimeout(() => setToast(""), 3000);
  }

  // เติมมาโครแบบประมาณ (จากแคล+หมวด) ให้ทุกเมนูที่ยังว่าง — ฟรี ไม่ใช้ AI
  async function estimateMacrosAll() {
    setEstimating(true);
    try {
      const res = await fetch("/api/admin/estimate-macros", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "error");
      await loadFoods();
      showToast(
        d.updated > 0
          ? `เติมมาโครแบบประมาณ ${d.updated} เมนูแล้ว ✓`
          : "ทุกเมนูมีมาโครครบแล้ว"
      );
    } catch (e) {
      showToast("ไม่สำเร็จ: " + (e.message || ""));
    } finally {
      setEstimating(false);
    }
  }

  // เติมแคล/มาโครด้วย AI อัตโนมัติ — ไล่คิวเมนูที่ยังไม่มีค่าครบ ทีละจาน
  // (เว้นจังหวะกัน rate limit และหยุดเองถ้าเจอ error ติดกันหลายครั้ง = น่าจะถึงโควต้ารายวัน)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function autoFillAI() {
    const queue = foods.filter(
      (f) => f.protein_g == null || f.carb_g == null || f.fat_g == null
    );
    if (queue.length === 0) {
      showToast("ทุกเมนูมีแคล/มาโครครบแล้ว ✓");
      return;
    }
    aiStop.current = false;
    setAiAuto({ running: true, done: 0, total: queue.length, ok: 0, errors: 0 });

    let done = 0;
    let ok = 0;
    let errors = 0;
    let streak = 0; // error ติดต่อกัน

    for (const f of queue) {
      if (aiStop.current) break;
      try {
        const res = await fetch("/api/ai-kcal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: f.id, name: f.name }),
        });
        const d = await res.json();
        if (res.ok) {
          ok++;
          streak = 0;
          setFoods((prev) =>
            prev.map((x) =>
              x.id === f.id
                ? {
                    ...x,
                    kcal: d.kcal,
                    portion: d.portion,
                    protein_g: d.protein_g,
                    carb_g: d.carb_g,
                    fat_g: d.fat_g,
                  }
                : x
            )
          );
        } else {
          errors++;
          streak++;
        }
      } catch {
        errors++;
        streak++;
      }
      done++;
      setAiAuto({ running: true, done, total: queue.length, ok, errors });

      // เจอ error ติดกัน 5 ครั้ง → น่าจะถึงโควต้ารายวันของ AI ฟรี หยุดไว้ก่อน
      if (streak >= 5) {
        setAiAuto({ running: false, done, total: queue.length, ok, errors });
        showToast(`หยุดชั่วคราว — AI อาจถึงโควต้ารายวันแล้ว (เติมสำเร็จ ${ok} เมนู) ลองต่อพรุ่งนี้`);
        return;
      }
      if (!aiStop.current) await sleep(3500); // เว้นจังหวะกัน rate limit
    }

    setAiAuto({ running: false, done, total: queue.length, ok, errors });
    showToast(
      aiStop.current
        ? `หยุดแล้ว — เติมสำเร็จ ${ok} เมนู`
        : `เติมครบแล้ว ✓ สำเร็จ ${ok} เมนู${errors ? `, พลาด ${errors}` : ""}`
    );
  }


  // เติมรูปให้เมนูที่ยังไม่มี (ไล่ทีละชุดจนครบ)
  async function fillImages() {
    setFilling(true);
    try {
      let remaining = 1;
      let guard = 0;
      while (remaining > 0 && guard < 20) {
        guard++;
        const res = await fetch("/api/fill-images?limit=15");
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "error");
        remaining = d.remaining ?? 0;
        setToast(`กำลังเติมรูป... เหลืออีก ${remaining} เมนู`);
      }
      await loadFoods();
      showToast("เติมรูปเมนูเสร็จแล้ว ✓");
    } catch {
      showToast("เติมรูปไม่สำเร็จ ลองใหม่");
    } finally {
      setFilling(false);
    }
  }

  // ดึงเมนูอาหารไทยจาก Wikipedia
  async function importFromWiki() {
    setImportingWiki(true);
    showToast("📚 กำลังดึงจาก Wikipedia...");
    try {
      const res = await fetch("/api/import-wiki");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "error");
      await loadFoods();
      showToast(
        d.added > 0 ? `เพิ่ม ${d.added} เมนูจาก Wikipedia ✓` : d.note || "ไม่มีเมนูใหม่"
      );
    } catch {
      showToast("ดึงจาก Wikipedia ไม่สำเร็จ");
    } finally {
      setImportingWiki(false);
    }
  }

  // ตรวจ+ซ่อมรูปที่โหลดไม่ได้ (เปลี่ยนเป็นรูปถัดไป)
  async function fixImages() {
    setFixing(true);
    try {
      let offset = 0;
      let more = true;
      let guard = 0;
      let total = 0;
      while (more && guard < 30) {
        guard++;
        const res = await fetch(`/api/fix-images?limit=10&offset=${offset}`);
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "error");
        offset = d.nextOffset;
        more = d.hasMore;
        total += d.fixed;
        setToast(`กำลังตรวจรูป... ซ่อมแล้ว ${total}`);
      }
      await loadFoods();
      showToast(`ซ่อมรูปเสร็จ — เปลี่ยน ${total} รูป ✓`);
    } catch {
      showToast("ซ่อมรูปไม่สำเร็จ ลองใหม่");
    } finally {
      setFixing(false);
    }
  }

  // ดึงเมนูเพิ่มจาก Wongnai (เฉพาะแอดมิน) — ใช้ตำแหน่ง + คำค้นปัจจุบัน
  function importFromWongnai() {
    setImporting(true);
    showToast("📍 กำลังหาเมนู...");

    const run = async (lat, lng) => {
      try {
        const p = new URLSearchParams({ lat, lng, q: query.trim() || "อาหารตามสั่ง" });
        const res = await fetch(`/api/import-dishes?${p}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "error");
        await loadFoods();
        showToast(
          data.added > 0
            ? `เพิ่ม ${data.added} เมนูจาก Wongnai แล้ว ✓`
            : data.note || "ไม่มีเมนูใหม่"
        );
      } catch {
        showToast("ดึงเมนูไม่สำเร็จ ลองใหม่");
      } finally {
        setImporting(false);
      }
    };

    // 1) ใช้ตำแหน่งที่จำไว้ก่อน (ไม่ต้องขอสิทธิ์ซ้ำ)
    const saved = loadLocation();
    if (saved) return run(saved.lat, saved.lng);

    // 2) ไม่มีที่จำไว้ → ขอ GPS (สำเร็จก็บันทึกไว้) / ไม่ได้ → ใช้กรุงเทพ
    const BKK = [13.7563, 100.5018];
    if (!navigator.geolocation) return run(...BKK);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveLocation(pos.coords.latitude, pos.coords.longitude, "ตำแหน่งของคุณ");
        run(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        showToast("ไม่ได้ตำแหน่ง — ใช้กรุงเทพแทน");
        run(...BKK);
      },
      { timeout: 8000 }
    );
  }

  async function addToMeal(food, slot) {
    if (!userId) return;
    const { error } = await supabase.from("meal_entries").insert({
      user_id: userId,
      eat_date: todayStr(),
      slot,
      food_name: food.name,
      kcal: food.kcal,
      protein_g: Number(food.protein_g) || 0,
      carb_g: Number(food.carb_g) || 0,
      fat_g: Number(food.fat_g) || 0,
    });
    showToast(error ? "เพิ่มไม่สำเร็จ" : `เพิ่ม "${food.name}" เข้ามื้อ${SLOT_LABELS[slot]}แล้ว ✓`);
  }

  async function addFavorite(food) {
    if (!userId) return;
    const { error } = await supabase.from("favorites").upsert(
      { user_id: userId, food_name: food.name, kcal: food.kcal, emoji: food.emoji },
      { onConflict: "user_id,food_name" }
    );
    showToast(error ? "บันทึกไม่สำเร็จ" : `เพิ่ม "${food.name}" เป็นเมนูโปรด ❤️`);
  }

  // สั่งเดลิเวอรี — เช็คตำแหน่งก่อน แล้วเปิด Wongnai ใกล้ตำแหน่งนั้น
  function orderDelivery(food) {
    const base = `https://www.wongnai.com/restaurants?q=${encodeURIComponent(food.name)}&features.delivery=1`;
    if (!navigator.geolocation) {
      window.open(base, "_blank");
      return;
    }
    showToast("📍 กำลังตรวจตำแหน่งของคุณ...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        window.open(`${base}&latitude=${latitude}&longitude=${longitude}`, "_blank");
        showToast(`สั่ง "${food.name}" ใกล้ตำแหน่งคุณ 🛵`);
      },
      () => {
        window.open(base, "_blank");
        showToast("ไม่ได้สิทธิ์ตำแหน่ง — เปิดค้นหาแบบทั่วไปแทน");
      },
      { timeout: 8000 }
    );
  }

  const categories = useMemo(() => {
    const set = new Set(foods.map((f) => f.category || "อื่นๆ"));
    return ["ทั้งหมด", ...set];
  }, [foods]);

  const cuisines = useMemo(() => {
    const set = new Set(foods.map((f) => f.cuisine).filter(Boolean));
    return ["ทั้งหมด", ...set];
  }, [foods]);

  const filtered = foods.filter((f) => {
    const matchText = f.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchCat = activeCat === "ทั้งหมด" || (f.category || "อื่นๆ") === activeCat;
    const matchCuisine =
      activeCuisine === "ทั้งหมด" || (f.cuisine || "อาหารไทย") === activeCuisine;
    return matchText && matchCat && matchCuisine;
  });

  // จัดกลุ่มตามหมวดหมู่
  const grouped = filtered.reduce((acc, f) => {
    const c = f.category || "อื่นๆ";
    (acc[c] = acc[c] || []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">เมนูอาหาร</h1>
          <p className="text-sm text-zinc-500">
            เลือกตามหมวดหมู่ เพิ่มเข้ามื้อ หรือสั่งเดลิเวอรีใกล้คุณ
          </p>
        </div>
        {email === "admin@nce.com" && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={importFromWongnai}
              disabled={importing || importingWiki || filling || fixing}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
              title="ดึงชื่อเมนูจากร้านใกล้ตัวบน Wongnai (แคลเป็นค่าประมาณ)"
            >
              {importing ? "กำลังดึง..." : "➕ ดึงเมนู (Wongnai)"}
            </button>
            <button
              onClick={importFromWiki}
              disabled={importingWiki || importing || filling || fixing}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
              title="ดึงชื่อเมนูอาหารไทยจาก Wikipedia (แคลเป็นค่าประมาณ)"
            >
              {importingWiki ? "กำลังดึง..." : "📚 ดึงเมนู (Wiki)"}
            </button>
            <button
              onClick={fillImages}
              disabled={filling || importing || fixing}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
              title="ค้นรูปจาก Bing มาเติมให้เมนูที่ยังไม่มีรูป"
            >
              {filling ? "กำลังเติมรูป..." : "🖼️ เติมรูป"}
            </button>
            <button
              onClick={fixImages}
              disabled={fixing || filling || importing}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
              title="ตรวจรูปที่โหลดไม่ได้ แล้วเปลี่ยนเป็นรูปถัดไป"
            >
              {fixing ? "กำลังซ่อม..." : "🔧 ซ่อมรูป"}
            </button>
            <button
              onClick={estimateMacrosAll}
              disabled={estimating || aiAuto.running || importing || importingWiki || filling || fixing}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
              title="ประมาณมาโครจากแคล+หมวดอาหาร เติมให้ทุกเมนูที่ยังว่างทันที (ฟรี ไม่ใช้ AI)"
            >
              {estimating ? "กำลังเติม..." : "🧮 เติมมาโครแบบประมาณ (ฟรี)"}
            </button>
            {aiAuto.running ? (
              <button
                onClick={() => {
                  aiStop.current = true;
                }}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                title="หยุดการเติมอัตโนมัติ"
              >
                ⏸️ หยุด ({aiAuto.done}/{aiAuto.total})
              </button>
            ) : (
              <button
                onClick={autoFillAI}
                disabled={estimating || importing || importingWiki || filling || fixing}
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-brand-dark disabled:opacity-50 dark:text-zinc-950"
                title="ให้ AI คำนวณแคล+มาโครให้เมนูที่ยังไม่มีค่า ทีละจานตามคิว (แม่นกว่าแต่จำกัด 20/วัน)"
              >
                🤖 ปรับด้วย AI
              </button>
            )}
          </div>
        )}
      </div>

      {/* ความคืบหน้าการเติมอัตโนมัติ */}
      {aiAuto.running && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700">
              🤖 กำลังเติมแคล/มาโครด้วย AI... {aiAuto.done}/{aiAuto.total} เมนู
            </span>
            <span className="text-zinc-400">
              สำเร็จ {aiAuto.ok}{aiAuto.errors ? ` · พลาด ${aiAuto.errors}` : ""}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-brand-dark transition-all"
              style={{ width: `${aiAuto.total ? Math.round((aiAuto.done / aiAuto.total) * 100) : 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            ทำทีละจานเพื่อกัน AI ฟรีโดนจำกัด — เปิดหน้านี้ค้างไว้ ถ้าปิดไปแล้วค่อยกดต่อใหม่ มันจะทำต่อจากที่ค้าง
          </p>
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ค้นหาเมนู เช่น กระเพรา, ผัดไทย..."
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand/40"
      />

      {/* แถบหมวดหมู่ (ประเภทจาน) */}
      <div>
        <div className="mb-1 text-xs font-medium text-zinc-400">ประเภท</div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeCat === c
                  ? "bg-brand text-zinc-900 dark:text-zinc-950"
                  : "bg-white text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* แถบสัญชาติอาหาร */}
      {cuisines.length > 1 && (
        <div>
          <div className="mb-1 text-xs font-medium text-zinc-400">สัญชาติอาหาร</div>
          <div className="flex flex-wrap gap-2">
            {cuisines.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCuisine(c)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeCuisine === c
                    ? "bg-zinc-900 text-white"
                    : "bg-white text-zinc-500 hover:bg-zinc-100"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          โหลดข้อมูลไม่สำเร็จ: {error}
        </p>
      )}

      {loading && <p className="py-10 text-center text-zinc-400">กำลังโหลดเมนู...</p>}

      {!loading && filtered.length === 0 && (
        <p className="py-10 text-center text-zinc-400">ไม่พบเมนูที่ค้นหา</p>
      )}

      {/* กลุ่มเมนูตามหมวดหมู่ */}
      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat}>
          <h2 className="mb-3 text-lg font-bold text-zinc-900">
            {cat} <span className="text-sm font-normal text-zinc-400">({items.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((f) => (
              <FoodCard
                key={`${f.id}:${f.image_url || "none"}`}
                food={f}
                isAdmin={email === "admin@nce.com"}
                onFav={() => addFavorite(f)}
                onOrder={() => orderDelivery(f)}
                onAdd={(slot) => addToMeal(f, slot)}
                onManage={() => setEditingFood(f)}
              />
            ))}
          </div>
        </section>
      ))}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {editingFood && (
        <EditFoodModal
          food={editingFood}
          onClose={() => setEditingFood(null)}
          onChanged={loadFoods}
          onToast={showToast}
        />
      )}
    </div>
  );
}

function EditFoodModal({ food, onClose, onChanged, onToast }) {
  const [form, setForm] = useState({
    name: food.name || "",
    kcal: food.kcal ?? "",
    category: food.category || "อื่นๆ",
    cuisine: food.cuisine || "อาหารไทย",
    image_url: food.image_url || "",
    portion: food.portion || "",
    protein_g: food.protein_g ?? "",
    carb_g: food.carb_g ?? "",
    fat_g: food.fat_g ?? "",
  });
  const [busy, setBusy] = useState("");
  const [confirming, setConfirming] = useState(false);
  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  async function save() {
    setBusy("save");
    try {
      const res = await fetch("/api/update-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: food.id, ...form }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "error");
      await onChanged();
      onToast(`บันทึก "${form.name}" แล้ว ✓`);
      onClose();
    } catch (e) {
      onToast("บันทึกไม่สำเร็จ: " + (e.message || ""));
      setBusy("");
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      const res = await fetch("/api/delete-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: food.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "error");
      await onChanged();
      onToast(`ลบ "${food.name}" แล้ว ✓`);
      onClose();
    } catch (e) {
      onToast("ลบไม่สำเร็จ: " + (e.message || ""));
      setBusy("");
    }
  }

  async function aiCalc() {
    setBusy("ai");
    try {
      const res = await fetch("/api/ai-kcal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: food.id, name: form.name }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "error");
      setForm((s) => ({
        ...s,
        kcal: d.kcal,
        portion: d.portion,
        protein_g: d.protein_g ?? "",
        carb_g: d.carb_g ?? "",
        fat_g: d.fat_g ?? "",
      }));
      onToast(`AI: ${d.kcal} แคล · P${d.protein_g}/C${d.carb_g}/F${d.fat_g} ก.`);
    } catch (e) {
      onToast("AI ไม่สำเร็จ: " + (e.message || ""));
    } finally {
      setBusy("");
    }
  }

  async function nextImage() {
    setBusy("image");
    try {
      const res = await fetch("/api/change-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: food.id, name: form.name, current: form.image_url }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "error");
      setForm((s) => ({ ...s, image_url: d.url }));
    } catch (e) {
      onToast("เปลี่ยนรูปไม่สำเร็จ: " + (e.message || ""));
    } finally {
      setBusy("");
    }
  }

  const inputCls =
    "w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand-dark";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">จัดการเมนู</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
            ✕
          </button>
        </div>

        {/* รูป + เปลี่ยนรูป */}
        <div className="relative mb-4 h-40 overflow-hidden rounded-2xl bg-brand/25">
          {form.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl">
              {food.emoji}
            </div>
          )}
          <button
            onClick={nextImage}
            disabled={busy === "image"}
            className="absolute bottom-2 right-2 rounded-full bg-zinc-900/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {busy === "image" ? "กำลังเปลี่ยน..." : "🔄 เปลี่ยนรูป"}
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-600">ชื่อเมนู</span>
            <input className={inputCls} value={form.name} onChange={set("name")} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-600">แคลอรี่</span>
              <input type="number" className={inputCls} value={form.kcal} onChange={set("kcal")} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-600">ประเภท</span>
              <select className={inputCls} value={form.category} onChange={set("category")}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          {/* คำนวณแคล + ปริมาณ ด้วย AI */}
          <div>
            <button
              onClick={aiCalc}
              disabled={!!busy}
              className="w-full rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-brand-dark disabled:opacity-50 dark:text-zinc-950"
            >
              {busy === "ai" ? "🤖 กำลังคำนวณ..." : "🤖 คำนวณแคล + ปริมาณ ด้วย AI"}
            </button>
            <label className="mt-2 block text-sm">
              <span className="mb-1 block text-zinc-600">ปริมาณ/หน่วยเสิร์ฟ</span>
              <input
                className={inputCls}
                value={form.portion}
                onChange={set("portion")}
                placeholder="เช่น 1 จาน (~350 กรัม)"
              />
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { k: "protein_g", label: "โปรตีน (ก.)" },
                { k: "carb_g", label: "คาร์บ (ก.)" },
                { k: "fat_g", label: "ไขมัน (ก.)" },
              ].map((m) => (
                <label key={m.k} className="block text-sm">
                  <span className="mb-1 block text-xs text-zinc-500">{m.label}</span>
                  <input
                    type="number"
                    className={inputCls}
                    value={form[m.k]}
                    onChange={set(m.k)}
                  />
                </label>
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-zinc-600">สัญชาติอาหาร</span>
            <select className={inputCls} value={form.cuisine} onChange={set("cuisine")}>
              {CUISINES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-600">ลิงก์รูป (แก้เองได้)</span>
            <input className={inputCls} value={form.image_url} onChange={set("image_url")} placeholder="https://..." />
          </label>
        </div>

        {confirming ? (
          <div className="mt-5 rounded-2xl bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">
              ลบเมนู “{food.name}” ออกจากระบบถาวร?
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={!!busy}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={remove}
                disabled={!!busy}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy === "delete" ? "กำลังลบ..." : "ลบเลย"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              onClick={() => setConfirming(true)}
              disabled={!!busy}
              className="rounded-full bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              🗑️ ลบเมนู
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-full border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                ปิด
              </button>
              <button
                onClick={save}
                disabled={!!busy}
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {busy === "save" ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FoodCard({ food, isAdmin, onFav, onOrder, onAdd, onManage }) {
  // หมายเหตุ: การ์ดถูก key ด้วย image_url → พอรูปเปลี่ยนจะ remount เอง (imgErr รีเซ็ต)
  const [imgErr, setImgErr] = useState(false);
  const showImg = food.image_url && !imgErr;
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {/* รูป/ไอคอนเมนู */}
      <div className="relative flex h-32 w-full items-center justify-center bg-brand/25">
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={food.image_url}
            alt={food.name}
            className="h-full w-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <span className="text-6xl">{food.emoji}</span>
        )}
        {isAdmin && (
          <button
            onClick={onManage}
            className="absolute left-2 top-2 flex h-8 items-center justify-center gap-1 rounded-full bg-white/90 px-2.5 text-xs font-medium text-zinc-600 shadow hover:bg-zinc-900 hover:text-white"
            title="จัดการเมนู (แก้ไข/ลบ/เปลี่ยนรูป)"
          >
            ✏️ จัดการ
          </button>
        )}
        <button
          onClick={onFav}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm text-zinc-400 shadow hover:text-red-500"
          title="เพิ่มเป็นเมนูโปรด"
        >
          ♥
        </button>
      </div>

      {/* เนื้อหา */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-zinc-900">{food.name}</h3>
          <span className="shrink-0 rounded-full bg-brand/30 px-2 py-0.5 text-xs font-medium text-zinc-700">
            {food.kcal} แคล
          </span>
        </div>
        {food.portion && (
          <p className="mt-0.5 text-xs text-zinc-400">{food.portion}</p>
        )}
        {(food.protein_g || food.carb_g || food.fat_g) && (
          <p className="mt-1 text-xs text-zinc-500">
            P {food.protein_g ?? 0} · C {food.carb_g ?? 0} · F {food.fat_g ?? 0} ก.
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(SLOT_LABELS).map(([slot, label]) => (
            <button
              key={slot}
              onClick={() => onAdd(slot)}
              className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-brand hover:text-zinc-900 dark:hover:text-zinc-950"
            >
              + {label}
            </button>
          ))}
          <button
            onClick={onOrder}
            className="ml-auto rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white hover:bg-zinc-700"
            title="สั่งเดลิเวอรี (เช็คตำแหน่ง)"
          >
            🛵 สั่ง
          </button>
        </div>
      </div>
    </div>
  );
}
