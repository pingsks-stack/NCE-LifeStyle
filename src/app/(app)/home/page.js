"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { blogPosts } from "@/lib/sampleData";

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

// นับจำนวนวันที่บันทึกมื้อ "ต่อเนื่อง" ถึงวันนี้ (หรือเมื่อวานถ้าวันนี้ยังไม่บันทึก)
function computeStreak(dates) {
  const set = new Set(dates);
  let cur = todayStr();
  if (!set.has(cur)) cur = addDays(cur, -1);
  let count = 0;
  while (set.has(cur)) {
    count++;
    cur = addDays(cur, -1);
  }
  return count;
}

// เลือกเมนูแนะนำตามแคล/มาโครที่ยังเหลือของวันนี้ (กฎอัจฉริยะ — ไม่ใช้ AI/โควต้า)
const NON_MEAL = ["เครื่องปรุง", "ไม่ใช่อาหาร"];

function recommend(allFoods, remaining, gaps, goal) {
  const foods = allFoods.filter((f) => !NON_MEAL.includes(f.category));
  if (!foods.length) return { items: [], reason: "" };

  // ยังไม่ตั้งเป้า → โชว์เมนูยอดนิยม
  if (!goal) {
    return { items: foods.slice(0, 6), reason: "เมนูยอดนิยม" };
  }

  // เกินเป้าแล้ว → แนะของแคลต่ำ
  if (remaining <= 0) {
    const light = [...foods].filter((f) => f.kcal > 0).sort((a, b) => a.kcal - b.kcal);
    return { items: light.slice(0, 6), reason: "ถึงเป้าแล้ว • แนะนำของว่างแคลต่ำ" };
  }

  const budget = remaining > 150 ? remaining : 300;
  let pool = foods.filter((f) => f.kcal > 0 && f.kcal <= budget);
  if (pool.length < 4) pool = [...foods].filter((f) => f.kcal > 0).sort((a, b) => a.kcal - b.kcal);

  // หามาโครที่ขาดมากสุด (ถ้าตั้งเป้ามาโครไว้)
  const order = [
    { key: "protein_g", gap: gaps.protein, label: "โปรตีน" },
    { key: "carb_g", gap: gaps.carb, label: "คาร์โบไฮเดรต" },
    { key: "fat_g", gap: gaps.fat, label: "ไขมัน" },
  ].sort((a, b) => b.gap - a.gap);
  const focus = order[0];

  let reason = `เหลืออีก ${remaining} แคล`;
  if (focus && focus.gap > 5) {
    pool = [...pool].sort((a, b) => (Number(b[focus.key]) || 0) - (Number(a[focus.key]) || 0));
    reason += ` • เน้น${focus.label}`;
  } else {
    pool = [...pool].sort((a, b) => Math.abs(a.kcal - budget / 2) - Math.abs(b.kcal - budget / 2));
  }
  return { items: pool.slice(0, 6), reason };
}

export default function HomePage() {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(1800);
  const [consumed, setConsumed] = useState(0);
  const [macros, setMacros] = useState({ protein: 0, carb: 0, fat: 0 });
  const [macroGoals, setMacroGoals] = useState({ protein: 0, carb: 0, fat: 0 });
  const [foods, setFoods] = useState([]);
  const [articles, setArticles] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [{ data: prof }, { data: entries }, { data: foodsData }, { data: allDates }] =
        await Promise.all([
          user
            ? supabase
                .from("profiles")
                .select("username, full_name, daily_goal_kcal, protein_goal_g, carb_goal_g, fat_goal_g")
                .eq("id", user.id)
                .single()
            : Promise.resolve({ data: null }),
          user
            ? supabase
                .from("meal_entries")
                .select("kcal, protein_g, carb_g, fat_g")
                .eq("user_id", user.id)
                .eq("eat_date", todayStr())
            : Promise.resolve({ data: [] }),
          supabase
            .from("foods")
            .select("id, name, kcal, emoji, image_url, category, protein_g, carb_g, fat_g")
            .order("id"),
          user
            ? supabase.from("meal_entries").select("eat_date").eq("user_id", user.id)
            : Promise.resolve({ data: [] }),
        ]);

      setStreak(computeStreak((allDates ?? []).map((r) => r.eat_date)));

      if (prof) {
        setName(prof.full_name || prof.username || "");
        if (prof.daily_goal_kcal) setGoal(prof.daily_goal_kcal);
        setMacroGoals({
          protein: prof.protein_goal_g ?? 0,
          carb: prof.carb_goal_g ?? 0,
          fat: prof.fat_goal_g ?? 0,
        });
      }
      const list = entries ?? [];
      setConsumed(list.reduce((s, e) => s + e.kcal, 0));
      setMacros({
        protein: Math.round(list.reduce((s, e) => s + (Number(e.protein_g) || 0), 0)),
        carb: Math.round(list.reduce((s, e) => s + (Number(e.carb_g) || 0), 0)),
        fat: Math.round(list.reduce((s, e) => s + (Number(e.fat_g) || 0), 0)),
      });
      setFoods(foodsData ?? []);
      setLoading(false);

      // บทความสุขภาพรายวัน (AI สร้างวันละ 1 แชร์ทุกคน) — โหลดแยก ไม่บล็อกหน้า
      fetch(`/api/health-article?date=${todayStr()}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.articles?.length) setArticles(d.articles);
        })
        .catch(() => {});
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = goal > 0 ? Math.min(100, Math.round((consumed / goal) * 100)) : 0;
  const remaining = Math.max(0, goal - consumed);
  const over = consumed > goal;
  const ringColor = over ? "#f87171" : "#22c55e";
  const ring = {
    background: `conic-gradient(${ringColor} 0% ${pct}%, var(--color-zinc-100) ${pct}% 100%)`,
  };

  const gaps = {
    protein: Math.max(0, macroGoals.protein - macros.protein),
    carb: Math.max(0, macroGoals.carb - macros.carb),
    fat: Math.max(0, macroGoals.fat - macros.fat),
  };
  const rec = recommend(foods, remaining, gaps, goal);
  const recItems = rec.items;

  // บทความที่จะโชว์ — ถ้ายังไม่มีจาก DB ใช้ของนิ่งไปก่อน
  const showArticles =
    articles.length > 0
      ? articles.map((a) => ({
          id: a.id,
          title: a.title,
          excerpt: a.excerpt,
          tag: a.tag,
          emoji: a.emoji,
        }))
      : blogPosts;

  return (
    <div className="space-y-8">
      {/* Streak บันทึกต่อเนื่อง */}
      {streak > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <div className="font-bold text-zinc-900">{streak} วันติดต่อกัน</div>
              <div className="text-xs text-zinc-500">บันทึกมื้ออาหารต่อเนื่อง — สู้ๆ!</div>
            </div>
          </div>
          <span className="text-xs font-medium text-zinc-400">
            {streak >= 7 ? "เยี่ยมมาก 🏆" : "อย่าให้ขาดนะ"}
          </span>
        </div>
      )}

      {/* วงแหวนพลังงานวันนี้ */}
      <section className="rounded-3xl bg-brand p-6">
        <h1 className="text-center text-xl font-bold text-zinc-900 dark:text-zinc-950">
          พลังงานวันนี้{name ? ` · ${name}` : ""}
        </h1>

        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
          <div className="flex h-44 w-44 items-center justify-center rounded-full" style={ring}>
            <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
              <span className="text-3xl font-bold text-zinc-900">{pct}%</span>
              <span className="text-xs text-zinc-500">ของเป้าหมาย</span>
            </div>
          </div>

          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-2">
              <span className="text-zinc-600">ได้รับแล้ว</span>
              <span className="font-bold text-zinc-900">{consumed} แคล</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-2">
              <span className="text-zinc-600">เป้าหมาย</span>
              <span className="font-bold text-zinc-900">{goal} แคล</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-2">
              <span className="text-zinc-600">{over ? "เกินมา" : "เหลืออีก"}</span>
              <span className={`font-bold ${over ? "text-red-500" : "text-green-600"}`}>
                {over ? consumed - goal : remaining} แคล
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/calculate" className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700">
            คำนวณแคล
          </Link>
          <Link href="/planner" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100">
            จัดมื้ออาหาร
          </Link>
        </div>
      </section>

      {/* มาโครวันนี้ */}
      {(macroGoals.protein > 0 || macros.protein > 0) && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-zinc-900">มาโครวันนี้</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { key: "protein", label: "โปรตีน", color: "#ff0844" },
              { key: "carb", label: "คาร์โบไฮเดรต", color: "#21d4fd" },
              { key: "fat", label: "ไขมัน", color: "#f5b700" },
            ].map((m) => {
              const val = macros[m.key];
              const g = macroGoals[m.key];
              const p = g > 0 ? Math.min(100, Math.round((val / g) * 100)) : 0;
              return (
                <div key={m.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-zinc-600">{m.label}</span>
                    <span className="font-medium text-zinc-800">
                      {val}{g > 0 ? ` / ${g}` : ""} ก.
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full" style={{ width: `${p}%`, background: m.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          {macroGoals.protein === 0 && (
            <p className="mt-3 text-center text-xs text-zinc-400">
              ตั้งเป้าหมายมาโครได้ที่ <Link href="/calculate" className="text-brand-dark underline">คำนวณแคล</Link>
            </p>
          )}
        </section>
      )}

      {/* เมนูแนะนำสำหรับคุณ (กฎอัจฉริยะตามแคล/มาโครที่เหลือ) */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">เมนูแนะนำสำหรับคุณ</h2>
          <Link href="/menu" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
            ดูทั้งหมด →
          </Link>
        </div>
        {rec.reason && <p className="mb-3 text-xs text-zinc-400">🎯 {rec.reason}</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
              ))
            : recItems.map((f) => (
                <Link
                  href="/planner"
                  key={f.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-20 items-center justify-center bg-brand/15 text-3xl">
                    {f.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      f.emoji || "🍽️"
                    )}
                  </div>
                  <div className="p-3">
                    <div className="truncate text-sm font-medium text-zinc-800">{f.name}</div>
                    <div className="text-xs text-zinc-500">{f.kcal} แคล</div>
                  </div>
                </Link>
              ))}
        </div>
      </section>

      {/* บทความสุขภาพ — AI สร้างวันละ 1 บทความ (เก็บไม่เกิน 60 วัน) */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">บทความสุขภาพ</h2>
          {articles.length > 0 && (
            <span className="rounded-full bg-brand/30 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-200">
              🤖 อัปเดตโดย AI ทุกวัน
            </span>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {showArticles.slice(0, 6).map((p) => (
            <article key={p.id} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-4xl">{p.emoji}</div>
              <span className="mt-3 w-fit rounded-full bg-brand/40 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-950">
                {p.tag}
              </span>
              <h3 className="mt-2 font-semibold text-zinc-900">{p.title}</h3>
              <p className="mt-1 flex-1 text-sm text-zinc-500">{p.excerpt}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
