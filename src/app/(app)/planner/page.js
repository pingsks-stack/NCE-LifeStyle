"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const SLOTS = [
  { key: "breakfast", emoji: "🌅", label: "มื้อเช้า" },
  { key: "lunch", emoji: "☀️", label: "มื้อเที่ยง" },
  { key: "dinner", emoji: "🌙", label: "มื้อเย็น" },
  { key: "snack", emoji: "🍪", label: "มื้อว่าง" },
];

const MACROS = [
  { key: "protein_g", label: "โปรตีน", goalKey: "protein", color: "#ff0844" },
  { key: "carb_g", label: "คาร์บ", goalKey: "carb", color: "#21d4fd" },
  { key: "fat_g", label: "ไขมัน", goalKey: "fat", color: "#f5b700" },
];

const TH_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n, 12);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function thaiDateLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
}

// ─────────────────────────────────────────────────────────
// กล่องค้นหา + เรียกดูเมนู (กรองหมวด + ค้นหา) แล้วเลือกใส่มื้อ
// ─────────────────────────────────────────────────────────
const FAV_CAT = "❤️ โปรด";

function FoodPicker({ slot, foods, categories, favNames, onAdd, onClose }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("ทั้งหมด");
  const [qty, setQty] = useState(1);
  const [flash, setFlash] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return foods
      .filter((f) => {
        if (cat === "ทั้งหมด") return true;
        if (cat === FAV_CAT) return favNames.has(f.name);
        return (f.category || "อื่นๆ") === cat;
      })
      .filter((f) => !term || f.name.toLowerCase().includes(term))
      .slice(0, 80);
  }, [q, cat, foods, favNames]);

  function pick(food) {
    onAdd(food, qty);
    setFlash(food.name);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 p-4">
          <h3 className="font-bold text-zinc-900">
            {slot.emoji} เพิ่มเมนูเข้า{slot.label}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
          >
            เสร็จ
          </button>
        </div>

        <div className="space-y-3 p-4 pb-2">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 ค้นหาเมนู เช่น ข้าวกระเพรา..."
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand-dark"
          />
          {/* ชิปกรองหมวด */}
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  cat === c
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-600">จำนวนเสิร์ฟ</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                className="h-8 w-8 rounded-full bg-zinc-100 font-bold text-zinc-700 hover:bg-zinc-200"
              >
                −
              </button>
              <span className="w-8 text-center font-bold text-zinc-900">{qty}</span>
              <button
                onClick={() => setQty((n) => Math.min(20, n + 1))}
                className="h-8 w-8 rounded-full bg-zinc-100 font-bold text-zinc-700 hover:bg-zinc-200"
              >
                +
              </button>
            </div>
            {flash && (
              <span className="ml-auto truncate text-green-600">✓ เพิ่ม “{flash}”</span>
            )}
          </div>
        </div>

        <ul className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {results.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => pick(f)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-zinc-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 text-2xl">
                  {f.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    f.emoji || "🍽️"
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-800">
                    {f.name}
                  </span>
                  <span className="block truncate text-xs text-zinc-400">
                    {f.kcal} แคล
                    {f.protein_g != null
                      ? ` · P${f.protein_g} C${f.carb_g} F${f.fat_g}`
                      : ""}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-zinc-900 dark:text-zinc-950">
                  + เพิ่ม
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="py-8 text-center text-sm text-zinc-400">ไม่พบเมนู</li>
          )}
        </ul>
      </div>
    </div>
  );
}

// วงแหวนแคลอรี่ (conic-gradient ไม่ต้องใช้ไลบรารี)
function CalorieRing({ consumed, goal }) {
  const pct = goal > 0 ? Math.min(100, Math.round((consumed / goal) * 100)) : 0;
  const over = consumed > goal && goal > 0;
  const color = over ? "#f87171" : "#22c55e";
  const remaining = Math.max(0, goal - consumed);
  return (
    <div
      className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(${color} 0% ${pct}%, var(--color-zinc-100) ${pct}% 100%)` }}
    >
      <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
        <span className="text-2xl font-bold text-zinc-900">{consumed}</span>
        <span className="text-[11px] text-zinc-400">/ {goal} แคล</span>
        <span className={`mt-0.5 text-[11px] font-medium ${over ? "text-red-500" : "text-green-600"}`}>
          {over ? `เกิน ${consumed - goal}` : `เหลือ ${remaining}`}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
export default function PlannerPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState(null);
  const [foods, setFoods] = useState([]);
  const [goal, setGoal] = useState(1800);
  const [macroGoals, setMacroGoals] = useState({ protein: 0, carb: 0, fat: 0 });
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [pickerSlot, setPickerSlot] = useState(null);
  const [err, setErr] = useState("");
  const [favNames, setFavNames] = useState(new Set());
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: foodsData }, { data: prof }, { data: favs }] = await Promise.all([
        supabase
          .from("foods")
          .select("id, name, kcal, emoji, image_url, portion, category, protein_g, carb_g, fat_g")
          .order("name"),
        supabase
          .from("profiles")
          .select("daily_goal_kcal, protein_goal_g, carb_goal_g, fat_goal_g")
          .eq("id", user.id)
          .single(),
        supabase.from("favorites").select("food_name").eq("user_id", user.id),
      ]);

      // ไม่ให้เครื่องปรุง/ของไม่ใช่อาหารมาอยู่ในตัวเลือกจัดมื้อ
      const NON_MEAL = ["เครื่องปรุง", "ไม่ใช่อาหาร"];
      setFoods((foodsData ?? []).filter((f) => !NON_MEAL.includes(f.category)));
      setFavNames(new Set((favs ?? []).map((f) => f.food_name)));
      if (prof?.daily_goal_kcal) setGoal(prof.daily_goal_kcal);
      setMacroGoals({
        protein: prof?.protein_goal_g ?? 0,
        carb: prof?.carb_goal_g ?? 0,
        fat: prof?.fat_goal_g ?? 0,
      });
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function loadEntries() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from("meal_entries")
        .select("id, slot, food_name, kcal, qty, protein_g, carb_g, fat_g")
        .eq("user_id", user.id)
        .eq("eat_date", date)
        .order("id");
      setEntries(data ?? []);
      setLoading(false);
    }
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(foods.map((f) => f.category || "อื่นๆ")));
    return ["ทั้งหมด", ...(favNames.size ? [FAV_CAT] : []), ...cats];
  }, [foods, favNames]);

  async function addItem(food, qty) {
    if (!userId || !pickerSlot) return;
    setErr("");
    const kcal = Math.round(food.kcal * qty);
    const m = (v) => Math.round((Number(v) || 0) * qty * 10) / 10;
    const { data, error } = await supabase
      .from("meal_entries")
      .insert({
        user_id: userId,
        eat_date: date,
        slot: pickerSlot,
        food_name: food.name,
        kcal,
        qty,
        protein_g: m(food.protein_g),
        carb_g: m(food.carb_g),
        fat_g: m(food.fat_g),
      })
      .select("id, slot, food_name, kcal, qty, protein_g, carb_g, fat_g")
      .single();
    if (error) {
      setErr("บันทึกไม่สำเร็จ: " + (error.message || ""));
      return;
    }
    if (data) setEntries((prev) => [...prev, data]);
  }

  async function removeItem(id) {
    const { error } = await supabase.from("meal_entries").delete().eq("id", id);
    if (!error) setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  // คัดลอกทุกมื้อของ "เมื่อวาน" (เทียบกับวันที่กำลังดู) มาลงวันนี้
  async function copyYesterday() {
    if (!userId) return;
    setErr("");
    setCopying(true);
    const y = addDays(date, -1);
    const { data: prev } = await supabase
      .from("meal_entries")
      .select("slot, food_name, kcal, qty, protein_g, carb_g, fat_g")
      .eq("user_id", userId)
      .eq("eat_date", y);
    if (!prev || prev.length === 0) {
      setCopying(false);
      setErr("วันก่อนหน้าไม่มีมื้อให้คัดลอก");
      setTimeout(() => setErr(""), 2500);
      return;
    }
    const rows = prev.map((e) => ({ ...e, user_id: userId, eat_date: date }));
    const { data, error } = await supabase
      .from("meal_entries")
      .insert(rows)
      .select("id, slot, food_name, kcal, qty, protein_g, carb_g, fat_g");
    setCopying(false);
    if (error) {
      setErr("คัดลอกไม่สำเร็จ: " + error.message);
      return;
    }
    if (data) setEntries((cur) => [...cur, ...data]);
  }

  const bySlot = (slot) => entries.filter((e) => e.slot === slot);
  const slotTotal = (slot) => bySlot(slot).reduce((s, e) => s + e.kcal, 0);
  const grandTotal = entries.reduce((s, e) => s + e.kcal, 0);
  const macroTotal = (key) =>
    Math.round(entries.reduce((s, e) => s + (Number(e[key]) || 0), 0));

  const isToday = date === todayStr();
  const activeSlot = SLOTS.find((s) => s.key === pickerSlot);

  return (
    <div className="space-y-5">
      {/* หัวเรื่อง + เลื่อนวัน */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">จัดมื้ออาหาร</h1>
          <p className="text-sm text-zinc-500">
            เลือกเมนูใส่แต่ละมื้อ ระบบรวมแคล+สารอาหารให้อัตโนมัติ
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
          <button
            onClick={() => setDate((d) => addDays(d, -1))}
            className="h-8 w-8 rounded-full text-zinc-500 hover:bg-zinc-100"
            title="วันก่อนหน้า"
          >
            ◀
          </button>
          <span className="min-w-[120px] text-center text-sm font-semibold text-zinc-800">
            {isToday ? "วันนี้" : thaiDateLabel(date)}
          </span>
          <button
            onClick={() => setDate((d) => addDays(d, 1))}
            className="h-8 w-8 rounded-full text-zinc-500 hover:bg-zinc-100"
            title="วันถัดไป"
          >
            ▶
          </button>
          {!isToday && (
            <button
              onClick={() => setDate(todayStr())}
              className="ml-1 rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white hover:bg-zinc-700"
            >
              วันนี้
            </button>
          )}
        </div>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          ⚠️ {err}
        </div>
      )}

      {/* แดชบอร์ดสรุปวันนี้ — วงแหวนแคล + แถบมาโคร */}
      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <CalorieRing consumed={grandTotal} goal={goal} />

          <div className="w-full flex-1 space-y-3">
            {MACROS.map((mc) => {
              const val = macroTotal(mc.key);
              const g = macroGoals[mc.goalKey];
              const pct = g > 0 ? Math.min(100, Math.round((val / g) * 100)) : 0;
              return (
                <div key={mc.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-zinc-600">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: mc.color }} />
                      {mc.label}
                    </span>
                    <span className="font-medium text-zinc-800">
                      {val}{g > 0 ? ` / ${g}` : ""} ก.
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${g > 0 ? pct : 0}%`, background: mc.color }}
                    />
                  </div>
                </div>
              );
            })}
            {macroGoals.protein === 0 && (
              <p className="pt-1 text-center text-xs text-zinc-400 sm:text-left">
                ตั้งเป้าหมายแคล+มาโครได้ที่{" "}
                <Link href="/calculate" className="text-brand-dark underline">คำนวณแคล</Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* บันทึกเร็ว: คัดลอกมื้อวันก่อนหน้า */}
      <div className="flex justify-end">
        <button
          onClick={copyYesterday}
          disabled={copying}
          className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          title="คัดลอกทุกมื้อของวันก่อนหน้ามาลงวันนี้"
        >
          {copying ? "กำลังคัดลอก..." : "📋 คัดลอกมื้อวันก่อนหน้า"}
        </button>
      </div>

      {/* การ์ดแต่ละมื้อ */}
      {loading ? (
        <p className="py-10 text-center text-zinc-400">กำลังโหลดมื้ออาหาร...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {SLOTS.map((slot) => (
            <div key={slot.key} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-zinc-900">
                  <span className="mr-1">{slot.emoji}</span>
                  {slot.label}
                </h2>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
                  {slotTotal(slot.key)} แคล
                </span>
              </div>

              <ul className="flex-1 space-y-2">
                {bySlot(slot.key).map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-zinc-800">
                      {e.food_name}
                      {e.qty > 1 && (
                        <span className="ml-1 text-xs text-zinc-400">×{e.qty}</span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-zinc-500">{e.kcal}</span>
                      <button
                        onClick={() => removeItem(e.id)}
                        className="text-zinc-300 hover:text-red-500"
                        title="ลบ"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
                {bySlot(slot.key).length === 0 && (
                  <li className="py-4 text-center text-sm text-zinc-300">ยังไม่มีเมนู</li>
                )}
              </ul>

              <button
                onClick={() => setPickerSlot(slot.key)}
                className="mt-4 w-full rounded-full border border-dashed border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-600 hover:border-brand-dark hover:text-zinc-900"
              >
                + เพิ่มเมนู
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-zinc-400">
        ดูสรุปย้อนหลังและกราฟได้ที่{" "}
        <Link href="/history" className="font-medium text-zinc-600 underline">ประวัติ</Link>
      </p>

      {pickerSlot && activeSlot && (
        <FoodPicker
          slot={activeSlot}
          foods={foods}
          categories={categories}
          favNames={favNames}
          onAdd={addItem}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  );
}
