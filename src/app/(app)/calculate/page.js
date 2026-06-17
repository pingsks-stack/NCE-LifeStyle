"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ACTIVITY,
  GOALS,
  bmiCategory,
  calcBMI,
  calcBMR,
  calcGoalKcal,
  calcMacroGoals,
  calcTDEE,
} from "@/lib/health";

export default function CalculatePage() {
  const supabase = createClient();
  const [userId, setUserId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    sex: "male",
    age: "",
    height_cm: "",
    weight_kg: "",
    activity_level: "moderate",
    goal: "maintain",
  });

  // ดึงข้อมูลเดิมจากโปรไฟล์มาเติมให้ (ถ้าล็อกอินอยู่)
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: p } = await supabase
        .from("profiles")
        .select("sex, age, height_cm, weight_kg, activity_level")
        .eq("id", user.id)
        .single();
      if (p) {
        setForm((f) => ({
          ...f,
          sex: p.sex ?? "male",
          age: p.age ?? "",
          height_cm: p.height_cm ?? "",
          weight_kg: p.weight_kg ?? "",
          activity_level: p.activity_level ?? "moderate",
        }));
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const age = Number(form.age) || 0;
  const heightCm = Number(form.height_cm) || 0;
  const weightKg = Number(form.weight_kg) || 0;
  const ready = age > 0 && heightCm > 0 && weightKg > 0;

  const bmi = calcBMI(weightKg, heightCm);
  const cat = bmiCategory(bmi);
  const bmr = calcBMR({ sex: form.sex, weightKg, heightCm, age });
  const tdee = calcTDEE(bmr, form.activity_level);
  const goalKcal = calcGoalKcal(tdee, form.goal);
  const macros = calcMacroGoals(goalKcal);

  // วงโดนัทสัดส่วนมาโคร (โปรตีน 30% / คาร์บ 40% / ไขมัน 30% ของแคล)
  const donut = {
    background: `conic-gradient(#ff0844 0% 30%, #21d4fd 30% 70%, #f5b700 70% 100%)`,
  };

  async function saveAsGoal() {
    setMsg("");
    if (!userId) {
      setMsg("กรุณาเข้าสู่ระบบก่อนจึงจะบันทึกเป็นเป้าหมายได้");
      return;
    }
    if (!ready) {
      setMsg("กรอกอายุ ส่วนสูง และน้ำหนักให้ครบก่อน");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        sex: form.sex,
        age,
        height_cm: heightCm,
        weight_kg: weightKg,
        activity_level: form.activity_level,
        daily_goal_kcal: goalKcal,
        ...macros,
      })
      .eq("id", userId);
    setSaving(false);
    setMsg(
      error
        ? "บันทึกไม่สำเร็จ: " + error.message
        : `ตั้งเป้าหมาย ${goalKcal} แคล/วัน เรียบร้อย ✓`
    );
    setTimeout(() => setMsg(""), 4000);
  }

  const inputCls =
    "w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand/40";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">คำนวณแคลอรี่ที่ควรได้รับต่อวัน</h1>
        <p className="text-sm text-zinc-500">
          กรอกข้อมูลร่างกาย ระบบจะคำนวณว่าคุณควรกินวันละกี่แคลตามเป้าหมาย (สูตร Mifflin–St Jeor)
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* ฟอร์มข้อมูลร่างกาย */}
        <div className="space-y-3 rounded-2xl bg-white p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-zinc-600">เพศ</span>
              <select className={inputCls} value={form.sex} onChange={set("sex")}>
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-zinc-600">อายุ (ปี)</span>
              <input type="number" min={1} className={inputCls} value={form.age} onChange={set("age")} placeholder="เช่น 22" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-zinc-600">ส่วนสูง (ซม.)</span>
              <input type="number" min={1} className={inputCls} value={form.height_cm} onChange={set("height_cm")} placeholder="เช่น 170" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-zinc-600">น้ำหนัก (กก.)</span>
              <input type="number" min={1} className={inputCls} value={form.weight_kg} onChange={set("weight_kg")} placeholder="เช่น 65" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-600">ระดับกิจกรรม</span>
            <select className={inputCls} value={form.activity_level} onChange={set("activity_level")}>
              {Object.entries(ACTIVITY).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-600">เป้าหมาย</span>
            <select className={inputCls} value={form.goal} onChange={set("goal")}>
              {Object.entries(GOALS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label} ({v.adjust > 0 ? "+" : ""}{v.adjust} แคล)
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* ผลลัพธ์ */}
        <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm">
          {ready ? (
            <>
              <div className="text-center">
                <div className="text-xs font-medium text-zinc-500">ควรกินวันละ</div>
                <div className="text-4xl font-bold text-zinc-900">
                  {goalKcal}
                  <span className="ml-1 text-lg font-medium text-zinc-500">แคล</span>
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  เพื่อ{GOALS[form.goal].label}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-zinc-50 p-3">
                  <div className="text-base font-bold text-zinc-900">{bmr}</div>
                  <div className="text-xs text-zinc-500">BMR</div>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3">
                  <div className="text-base font-bold text-zinc-900">{tdee}</div>
                  <div className="text-xs text-zinc-500">TDEE</div>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3">
                  <div className="text-base font-bold" style={{ color: cat.color }}>{bmi}</div>
                  <div className="text-xs" style={{ color: cat.color }}>{cat.label}</div>
                </div>
              </div>

              {/* สัดส่วนมาโครเป้าหมาย */}
              <div className="mt-5 flex items-center gap-5">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={donut}>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xs font-medium text-zinc-500">
                    มาโคร
                  </div>
                </div>
                <div className="flex-1 space-y-1.5 text-sm">
                  {[
                    { label: "โปรตีน", g: macros.protein_goal_g, color: "#ff0844" },
                    { label: "คาร์บ", g: macros.carb_goal_g, color: "#21d4fd" },
                    { label: "ไขมัน", g: macros.fat_goal_g, color: "#f5b700" },
                  ].map((m) => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-zinc-600">
                        <span className="inline-block h-3 w-3 rounded-full" style={{ background: m.color }} />
                        {m.label}
                      </span>
                      <span className="font-medium text-zinc-800">{m.g} ก./วัน</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={saveAsGoal}
                disabled={saving}
                className="mt-6 w-full rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "ตั้งเป็นเป้าหมายของฉัน"}
              </button>
              {msg && <p className="mt-2 text-center text-sm text-zinc-600">{msg}</p>}
              <p className="mt-2 text-center text-xs text-zinc-400">
                ตั้งแล้วไป{" "}
                <Link href="/planner" className="text-brand-dark underline">จัดมื้ออาหาร</Link>
                {" "}เพื่อบันทึกสิ่งที่กินได้เลย
              </p>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center text-zinc-400">
              <div className="text-4xl">🧮</div>
              <p className="mt-3 text-sm">กรอกอายุ ส่วนสูง และน้ำหนัก<br />เพื่อดูผลคำนวณ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
