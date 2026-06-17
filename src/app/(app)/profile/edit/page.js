"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [goalKcal, setGoalKcal] = useState(null);

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    job: "",
  });

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, username, job, daily_goal_kcal")
        .eq("id", user.id)
        .single();
      if (p) {
        setForm({
          full_name: p.full_name ?? "",
          username: p.username ?? "",
          job: p.job ?? "",
        });
        setGoalKcal(p.daily_goal_kcal ?? null);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSave(e) {
    e.preventDefault();
    setMsg("");
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name || null,
        username: form.username || null,
        job: form.job || null,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setMsg("บันทึกไม่สำเร็จ: " + error.message);
      return;
    }
    router.push("/profile");
    router.refresh();
  }

  if (loading) {
    return <p className="py-10 text-center text-zinc-400">กำลังโหลด...</p>;
  }

  const inputCls =
    "w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand/40";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/profile" className="text-zinc-400 hover:text-zinc-700">
          ←
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">แก้ไขโปรไฟล์</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* ข้อมูลทั่วไป */}
        <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold text-zinc-900">ข้อมูลทั่วไป</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-zinc-600">ชื่อ-นามสกุล</span>
              <input className={inputCls} value={form.full_name} onChange={set("full_name")} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-zinc-600">ชื่อผู้ใช้</span>
              <input className={inputCls} value={form.username} onChange={set("username")} />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-600">อาชีพ</span>
            <input className={inputCls} value={form.job} onChange={set("job")} placeholder="เช่น นักศึกษา, พนักงานออฟฟิศ" />
          </label>
        </div>

        {/* ข้อมูลร่างกาย/เป้าหมาย → ย้ายไปหน้าคำนวณแคล */}
        <div className="rounded-2xl bg-brand/20 p-5">
          <h2 className="font-bold text-zinc-900">ข้อมูลร่างกาย & เป้าหมายแคล</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {goalKcal
              ? `เป้าหมายปัจจุบัน ${goalKcal} แคล/วัน`
              : "ยังไม่ได้ตั้งเป้าหมายแคล"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            กรอกเพศ/อายุ/ส่วนสูง/น้ำหนัก/กิจกรรม แล้วระบบจะคำนวณเป้าหมายแคลและมาโครให้อัตโนมัติ
          </p>
          <Link
            href="/calculate"
            className="mt-3 inline-flex rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            🧮 ไปที่คำนวณแคล
          </Link>
        </div>

        {msg && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{msg}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-zinc-900 px-6 py-3 font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
        </button>
      </form>
    </div>
  );
}
