"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { bmiCategory, calcBMI, calcBMR, calcBodyFat, calcTDEE } from "@/lib/health";

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function shortDate(iso) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d}/${m}`;
}

export default function WeightPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [heightCm, setHeightCm] = useState(0);
  const [sex, setSex] = useState("male");
  const [bf, setBf] = useState({ neck: "", waist: "", hip: "" });
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  // ข้อมูลสำหรับพยากรณ์ + เป้าหมายน้ำหนัก
  const [body, setBody] = useState({ age: 0, activity: "moderate", goalKcal: 0 });
  const [target, setTarget] = useState("");
  const [savedTarget, setSavedTarget] = useState(null);
  const [tMsg, setTMsg] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const [{ data: prof }, { data: w }] = await Promise.all([
        supabase
          .from("profiles")
          .select("height_cm, weight_kg, sex, age, activity_level, daily_goal_kcal, target_weight_kg")
          .eq("id", user.id)
          .single(),
        supabase
          .from("weight_logs")
          .select("id, log_date, weight_kg")
          .eq("user_id", user.id)
          .order("log_date", { ascending: true }),
      ]);
      if (prof?.height_cm) setHeightCm(Number(prof.height_cm));
      if (prof?.sex) setSex(prof.sex);
      if (prof?.weight_kg && !weight) setWeight(String(prof.weight_kg));
      setBody({
        age: Number(prof?.age) || 0,
        activity: prof?.activity_level || "moderate",
        goalKcal: Number(prof?.daily_goal_kcal) || 0,
      });
      if (prof?.target_weight_kg) {
        setSavedTarget(Number(prof.target_weight_kg));
        setTarget(String(prof.target_weight_kg));
      }
      setLogs(w ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addLog(e) {
    e.preventDefault();
    setMsg("");
    const wk = Number(weight);
    if (!wk || !userId) {
      setMsg("กรุณากรอกน้ำหนัก");
      return;
    }
    // upsert แบบเดียวต่อวัน: ลบของวันเดิมก่อน แล้วเพิ่มใหม่
    await supabase.from("weight_logs").delete().eq("user_id", userId).eq("log_date", date);
    const { data, error } = await supabase
      .from("weight_logs")
      .insert({ user_id: userId, log_date: date, weight_kg: wk })
      .select("id, log_date, weight_kg")
      .single();
    if (error) {
      setMsg("บันทึกไม่สำเร็จ: " + error.message);
      return;
    }
    // อัปเดตน้ำหนักล่าสุดในโปรไฟล์ด้วย
    await supabase.from("profiles").update({ weight_kg: wk }).eq("id", userId);

    const next = [...logs.filter((l) => l.log_date !== date), data].sort((a, b) =>
      a.log_date < b.log_date ? -1 : 1
    );
    setLogs(next);
    setMsg("บันทึกน้ำหนักแล้ว ✓");
    setTimeout(() => setMsg(""), 2500);
  }

  async function saveTarget() {
    setTMsg("");
    const t = Number(target);
    if (!t || !userId) {
      setTMsg("กรอกน้ำหนักเป้าหมายก่อน");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ target_weight_kg: t })
      .eq("id", userId);
    if (error) {
      setTMsg("บันทึกไม่สำเร็จ: " + error.message);
      return;
    }
    setSavedTarget(t);
    setTMsg("ตั้งเป้าหมายแล้ว ✓");
    setTimeout(() => setTMsg(""), 2500);
  }

  if (loading) {
    return <p className="py-10 text-center text-zinc-400">กำลังโหลด...</p>;
  }

  const latest = logs.length ? logs[logs.length - 1].weight_kg : Number(weight) || 0;
  const bmi = calcBMI(latest, heightCm);
  const cat = bmiCategory(bmi);
  const chartData = logs.map((l) => ({ label: shortDate(l.log_date), w: Number(l.weight_kg) }));
  const first = logs.length ? Number(logs[0].weight_kg) : 0;
  const diff = latest && first ? Math.round((latest - first) * 10) / 10 : 0;

  // พยากรณ์เวลาถึงเป้าหมายน้ำหนัก (1 กก. ≈ 7700 แคล)
  const tdee = calcTDEE(calcBMR({ sex, weightKg: latest, heightCm, age: body.age }), body.activity);
  const dailyDelta = body.goalKcal && tdee ? body.goalKcal - tdee : 0; // <0 = ขาดดุล → ลด
  const weeklyKg = Math.round(((dailyDelta * 7) / 7700) * 100) / 100;
  let prediction = null;
  if (savedTarget && latest) {
    const need = savedTarget - latest; // ลบ = ต้องลด
    if (Math.abs(need) < 0.1) prediction = { state: "reached" };
    else if (Math.abs(weeklyKg) < 0.05) prediction = { state: "flat" };
    else if (need < 0 === weeklyKg < 0)
      prediction = { state: "ok", weeks: Math.ceil(Math.abs(need) / Math.abs(weeklyKg)) };
    else prediction = { state: "mismatch" };
  }

  // โดเมนแกน Y ให้รวมเส้นเป้าหมายด้วย
  let yDomain = ["dataMin - 2", "dataMax + 2"];
  if (chartData.length && savedTarget) {
    const ws = chartData.map((d) => d.w);
    yDomain = [Math.floor(Math.min(...ws, savedTarget) - 1), Math.ceil(Math.max(...ws, savedTarget) + 1)];
  }

  const bodyFat = calcBodyFat({
    sex,
    heightCm,
    neckCm: Number(bf.neck),
    waistCm: Number(bf.waist),
    hipCm: Number(bf.hip),
  });

  const inputCls =
    "w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand/40";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">บันทึกน้ำหนัก</h1>
        <p className="text-sm text-zinc-500">ติดตามน้ำหนักและแนวโน้มของคุณ</p>
      </div>

      {/* สรุป */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <div className="text-xl font-bold text-zinc-900">{latest || "-"}</div>
          <div className="text-xs text-zinc-500">น้ำหนักล่าสุด (กก.)</div>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <div className="text-xl font-bold" style={{ color: cat.color }}>
            {bmi || "-"}
          </div>
          <div className="text-xs text-zinc-500">BMI · {cat.label}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <div className={`text-xl font-bold ${diff > 0 ? "text-red-500" : diff < 0 ? "text-green-600" : "text-zinc-900"}`}>
            {diff > 0 ? "+" : ""}
            {diff || "0"}
          </div>
          <div className="text-xs text-zinc-500">เปลี่ยนแปลงรวม (กก.)</div>
        </div>
      </div>

      {/* เป้าหมายน้ำหนัก + พยากรณ์ */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-zinc-900">🎯 เป้าหมายน้ำหนัก</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-600">น้ำหนักเป้าหมาย (กก.)</span>
            <input
              type="number"
              step="0.1"
              className={`${inputCls} w-40`}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="เช่น 60"
            />
          </label>
          <button
            onClick={saveTarget}
            className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            ตั้งเป้า
          </button>
          {tMsg && <span className="text-sm text-zinc-500">{tMsg}</span>}
        </div>

        {savedTarget && (
          <div className="mt-4 rounded-xl bg-brand/20 p-4 text-sm text-zinc-700">
            {!body.goalKcal ? (
              <>
                ตั้งข้อมูลร่างกาย + เป้าหมายแคลที่{" "}
                <Link href="/calculate" className="font-medium text-brand-dark underline">คำนวณแคล</Link>{" "}
                ก่อน เพื่อให้ระบบพยากรณ์เวลาถึงเป้าได้
              </>
            ) : prediction?.state === "reached" ? (
              <>🎉 ยินดีด้วย! คุณถึงเป้าหมาย {savedTarget} กก. แล้ว</>
            ) : prediction?.state === "ok" ? (
              <>
                จากแคลเป้าหมายตอนนี้ คาดว่าอีกประมาณ{" "}
                <b className="text-zinc-900">{prediction.weeks} สัปดาห์</b> ถึงเป้า {savedTarget} กก.
                <span className="text-zinc-500"> (~{Math.abs(weeklyKg)} กก./สัปดาห์)</span>
              </>
            ) : prediction?.state === "mismatch" ? (
              <>
                ⚠️ ตอนนี้แคลเป้าหมายทำให้น้ำหนัก{weeklyKg < 0 ? "ลด" : "เพิ่ม"} แต่เป้าหมายของคุณคือ
                {savedTarget < latest ? "ลด" : "เพิ่ม"}น้ำหนัก — ปรับเป้าหมายที่{" "}
                <Link href="/calculate" className="font-medium text-brand-dark underline">คำนวณแคล</Link>
              </>
            ) : (
              <>
                แคลเป้าหมายใกล้เคียงพลังงานที่ใช้ (TDEE) น้ำหนักจะแทบไม่เปลี่ยน — ปรับเป้าที่{" "}
                <Link href="/calculate" className="font-medium text-brand-dark underline">คำนวณแคล</Link>{" "}
                ถ้าอยากให้ขยับ
              </>
            )}
          </div>
        )}
      </section>

      {/* ฟอร์มบันทึก */}
      <form onSubmit={addLog} className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-zinc-900">บันทึกน้ำหนักวันนี้</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-600">วันที่</span>
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-600">น้ำหนัก (กก.)</span>
            <input type="number" step="0.1" className={inputCls} value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
          <button type="submit" className="self-end rounded-xl bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-700">
            บันทึก
          </button>
        </div>
        {msg && <p className="mt-2 text-sm text-zinc-500">{msg}</p>}
      </form>

      {/* กราฟแนวโน้ม */}
      {chartData.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-zinc-900">แนวโน้มน้ำหนัก</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-zinc-100)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis domain={yDomain} tick={{ fontSize: 12, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-white)",
                    border: "1px solid var(--color-zinc-200)",
                    borderRadius: "0.75rem",
                  }}
                  labelStyle={{ color: "var(--color-zinc-500)", fontSize: 12 }}
                  itemStyle={{ color: "var(--color-zinc-800)", fontSize: 12 }}
                  formatter={(v) => [`${v} กก.`, "น้ำหนัก"]}
                  labelFormatter={(l) => `วันที่ ${l}`}
                />
                {savedTarget && (
                  <ReferenceLine
                    y={savedTarget}
                    stroke="#22c55e"
                    strokeDasharray="5 4"
                    label={{ value: `เป้า ${savedTarget}`, fontSize: 11, fill: "#22c55e", position: "insideTopRight" }}
                  />
                )}
                <Line type="monotone" dataKey="w" stroke="#f5b700" strokeWidth={3} dot={{ r: 4, fill: "#f5b700" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* เครื่องคำนวณ % ไขมันในร่างกาย (สูตร US Navy) */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-bold text-zinc-900">คำนวณ % ไขมันในร่างกาย</h2>
        <p className="mb-3 text-xs text-zinc-400">
          ใช้สูตรกองทัพเรือสหรัฐ — วัดด้วยสายวัดตัว (หน่วย ซม.) · เพศ/ส่วนสูงดึงจากโปรไฟล์ (
          {sex === "female" ? "หญิง" : "ชาย"}, {heightCm || "?"} ซม.)
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-600">รอบคอ (ซม.)</span>
            <input type="number" className={inputCls} value={bf.neck} onChange={(e) => setBf((s) => ({ ...s, neck: e.target.value }))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-600">รอบเอว (ซม.)</span>
            <input type="number" className={inputCls} value={bf.waist} onChange={(e) => setBf((s) => ({ ...s, waist: e.target.value }))} />
          </label>
          {sex === "female" && (
            <label className="text-sm">
              <span className="mb-1 block text-zinc-600">รอบสะโพก (ซม.)</span>
              <input type="number" className={inputCls} value={bf.hip} onChange={(e) => setBf((s) => ({ ...s, hip: e.target.value }))} />
            </label>
          )}
        </div>
        <div className="mt-4 rounded-xl bg-brand/20 p-4 text-center">
          <div className="text-3xl font-bold text-zinc-900">{bodyFat ? `${bodyFat}%` : "—"}</div>
          <div className="text-xs text-zinc-500">
            {bodyFat
              ? "% ไขมันโดยประมาณ"
              : "กรอกค่าให้ครบ + ตั้งเพศ/ส่วนสูงในโปรไฟล์ก่อน"}
          </div>
        </div>
      </div>
    </div>
  );
}
