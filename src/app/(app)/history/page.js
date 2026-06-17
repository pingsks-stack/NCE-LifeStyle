"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";

function formatThaiDate(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  return `${d} ${months[m - 1]} ${y + 543}`;
}

function shortDate(isoDate) {
  const [, m, d] = isoDate.split("-").map(Number);
  return `${d}/${m}`;
}

export default function HistoryPage() {
  const supabase = createClient();
  const [days, setDays] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [goal, setGoal] = useState(1800);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: prof }, { data: entries }, { data: favs }] = await Promise.all([
        supabase.from("profiles").select("daily_goal_kcal").eq("id", user.id).single(),
        supabase.from("meal_entries").select("eat_date, kcal").eq("user_id", user.id),
        supabase
          .from("favorites")
          .select("food_name, kcal, emoji")
          .eq("user_id", user.id)
          .order("id", { ascending: false }),
      ]);

      if (prof?.daily_goal_kcal) setGoal(prof.daily_goal_kcal);

      const map = {};
      (entries ?? []).forEach((e) => {
        map[e.eat_date] = (map[e.eat_date] ?? 0) + e.kcal;
      });
      const grouped = Object.entries(map)
        .map(([date, kcal]) => ({ date, kcal }))
        .sort((a, b) => (a.date < b.date ? 1 : -1));

      setDays(grouped);
      setFavorites(favs ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <p className="py-10 text-center text-zinc-400">กำลังโหลดประวัติ...</p>;
  }

  // ข้อมูลกราฟ: เรียงเก่า→ใหม่ เอา 7 วันล่าสุด
  const chartData = [...days]
    .reverse()
    .slice(-7)
    .map((d) => ({ ...d, label: shortDate(d.date) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">ประวัติ</h1>
        <p className="text-sm text-zinc-500">
          พลังงานที่ได้รับย้อนหลัง (เป้าหมาย {goal} แคล/วัน) และเมนูโปรดของคุณ
        </p>
      </div>

      {/* กราฟแท่ง 7 วันล่าสุด */}
      {chartData.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-zinc-900">พลังงาน 7 วันล่าสุด</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--color-zinc-100)" }}
                  contentStyle={{
                    background: "var(--color-white)",
                    border: "1px solid var(--color-zinc-200)",
                    borderRadius: "0.75rem",
                  }}
                  labelStyle={{ color: "var(--color-zinc-500)", fontSize: 12 }}
                  itemStyle={{ color: "var(--color-zinc-800)", fontSize: 12 }}
                  formatter={(v) => [`${v} แคล`, "พลังงาน"]}
                  labelFormatter={(l) => `วันที่ ${l}`}
                />
                <ReferenceLine y={goal} stroke="#f5b700" strokeDasharray="4 4" />
                <Bar dataKey="kcal" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.kcal > goal ? "#f87171" : "#ffd60a"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-xs text-zinc-400">
            เส้นประ = เป้าหมาย {goal} แคล · แท่งแดง = เกินเป้าหมาย
          </p>
        </section>
      )}

      {/* รายการรายวัน */}
      <section className="space-y-3">
        {days.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-400 shadow-sm">
            ยังไม่มีประวัติ — ลองไปจัดมื้ออาหารหรือเพิ่มเมนูดูก่อนนะ
          </div>
        )}
        {days.map((d) => {
          const pct = Math.min(100, Math.round((d.kcal / goal) * 100));
          const over = d.kcal > goal;
          return (
            <div key={d.date} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-800">{formatThaiDate(d.date)}</span>
                <span className={over ? "text-red-500" : "text-zinc-500"}>
                  {d.kcal} / {goal} แคล
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full ${over ? "bg-red-400" : "bg-brand-dark"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* เมนูโปรด */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-zinc-900">เมนูโปรด ❤️</h2>
        {favorites.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-400 shadow-sm">
            ยังไม่มีเมนูโปรด
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {favorites.map((f, i) => (
              <div key={i} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="text-3xl">{f.emoji}</div>
                <div className="mt-2 font-medium text-zinc-800">{f.food_name}</div>
                <div className="text-sm text-zinc-500">{f.kcal} แคล</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
