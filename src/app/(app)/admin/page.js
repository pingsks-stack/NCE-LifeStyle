"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "admin@nce.com";

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function AdminPage() {
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(null); // null = กำลังเช็ก
  const [meId, setMeId] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [dupes, setDupes] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [delId, setDelId] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }
      setMeId(user.id);
      const { data: prof } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      const admin = user.email === ADMIN_EMAIL || !!prof?.is_admin;
      setIsAdmin(admin);
      if (admin) {
        const [ov, us, dp] = await Promise.all([
          fetch(`/api/admin/overview?date=${todayStr()}`).then((r) => r.json()),
          fetch("/api/admin/users").then((r) => r.json()),
          fetch("/api/admin/duplicates").then((r) => r.json()),
        ]);
        if (!ov.error) setStats(ov);
        if (us.users) setUsers(us.users);
        if (dp.groups) setDupes(dp.groups);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flash(t) {
    setToast(t);
    setTimeout(() => setToast(""), 3000);
  }

  async function toggleAdmin(u) {
    setBusyId(u.id);
    try {
      const res = await fetch("/api/admin/set-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id, makeAdmin: !u.is_admin }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "error");
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, is_admin: !u.is_admin } : x))
      );
      setStats((s) =>
        s ? { ...s, admins: s.admins + (u.is_admin ? -1 : 1) } : s
      );
      flash(!u.is_admin ? `ตั้ง ${u.email} เป็นแอดมินแล้ว ✓` : `ถอนสิทธิ์ ${u.email} แล้ว`);
    } catch (e) {
      flash("ไม่สำเร็จ: " + (e.message || ""));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteDupe(group, item) {
    setDelId(item.id);
    try {
      const res = await fetch("/api/delete-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "error");
      setDupes((prev) =>
        prev
          .map((g) => (g === group ? { items: g.items.filter((x) => x.id !== item.id) } : g))
          .filter((g) => g.items.length > 1)
      );
      setStats((s) => (s ? { ...s, foods: s.foods - 1 } : s));
      flash(`ลบ "${item.name}" แล้ว ✓`);
    } catch (e) {
      flash("ลบไม่สำเร็จ: " + (e.message || ""));
    } finally {
      setDelId(null);
    }
  }

  if (isAdmin === null) {
    return <p className="py-10 text-center text-zinc-400">กำลังตรวจสอบสิทธิ์...</p>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-3 text-xl font-bold text-zinc-900">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="mt-1 text-sm text-zinc-500">
          หน้านี้สำหรับผู้ดูแลระบบ (แอดมิน) เท่านั้น
        </p>
      </div>
    );
  }

  const statCards = [
    { label: "เมนูทั้งหมด", value: stats?.foods, emoji: "🍽️" },
    { label: "สมาชิก", value: stats?.users, emoji: "👥" },
    { label: "แอดมิน", value: stats?.admins, emoji: "👑" },
    { label: "มื้อที่บันทึกวันนี้", value: stats?.mealsToday, emoji: "📅" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">แดชบอร์ดแอดมิน 👑</h1>
        <p className="text-sm text-zinc-500">ภาพรวมระบบ คุณภาพข้อมูล และจัดการสมาชิก</p>
      </div>

      {toast && (
        <div className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white">
          {toast}
        </div>
      )}

      {/* สถิติรวม */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-2xl">{c.emoji}</div>
            <div className="mt-2 text-2xl font-bold text-zinc-900">
              {c.value ?? "—"}
            </div>
            <div className="text-xs text-zinc-500">{c.label}</div>
          </div>
        ))}
      </div>

      {/* คุณภาพข้อมูลเมนู */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-zinc-900">คุณภาพข้อมูลเมนู</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
            <span className="text-sm text-zinc-600">เมนูที่ยังไม่มีมาโคร</span>
            <span className="font-bold text-zinc-900">{stats?.foodsNoMacro ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
            <span className="text-sm text-zinc-600">เมนูที่ยังไม่มีรูป</span>
            <span className="font-bold text-zinc-900">{stats?.foodsNoImage ?? "—"}</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          เติมแคล/มาโคร/รูปอัตโนมัติ และแก้ไขรายเมนูได้ที่หน้าจัดการเมนู
        </p>
        <Link
          href="/menu"
          className="mt-3 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-brand-dark dark:text-zinc-950"
        >
          🛠️ ไปจัดการเมนูทั้งหมด →
        </Link>
      </section>

      {/* จัดการสมาชิก */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-zinc-900">จัดการสมาชิก ({users.length})</h2>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">สมาชิก</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">เป้าหมาย</th>
                <th className="px-4 py-3 text-right font-medium">สิทธิ์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((u) => {
                const isMe = u.id === meId;
                const isSeed = u.email === ADMIN_EMAIL;
                return (
                  <tr key={u.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-800">
                          {u.full_name || u.username || "—"}
                        </span>
                        {u.is_admin && (
                          <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-zinc-800 dark:text-zinc-950">
                            👑 แอดมิน{isSeed ? "หลัก" : ""}
                          </span>
                        )}
                        {isMe && <span className="text-xs text-zinc-400">(คุณ)</span>}
                      </div>
                      <div className="text-xs text-zinc-400">{u.email}</div>
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-600 sm:table-cell">
                      {u.daily_goal_kcal ? `${u.daily_goal_kcal} แคล` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isMe || isSeed ? (
                        <span className="text-xs text-zinc-300">—</span>
                      ) : (
                        <button
                          onClick={() => toggleAdmin(u)}
                          disabled={busyId === u.id}
                          className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                            u.is_admin
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-zinc-900 text-white hover:bg-zinc-700"
                          }`}
                        >
                          {busyId === u.id
                            ? "..."
                            : u.is_admin
                            ? "ถอนแอดมิน"
                            : "ตั้งเป็นแอดมิน"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-zinc-400">
                    กำลังโหลดรายชื่อ...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* เมนูซ้ำ */}
      <section>
        <h2 className="mb-1 text-lg font-bold text-zinc-900">
          เมนูซ้ำที่ควรตรวจ {dupes.length > 0 && `(${dupes.length} กลุ่ม)`}
        </h2>
        <p className="mb-3 text-xs text-zinc-400">
          ชื่อคล้ายกัน (ตัดวงเล็บ/ช่องว่างแล้วตรงกัน) — เลือกเก็บตัวที่ข้อมูลครบ แล้วลบตัวซ้ำออก
        </p>
        {dupes.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-400 shadow-sm">
            ไม่พบเมนูซ้ำ 🎉
          </div>
        ) : (
          <div className="space-y-3">
            {dupes.map((g, i) => (
              <div key={i} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
                {g.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-zinc-800">{it.name}</div>
                      <div className="truncate text-xs text-zinc-400">
                        {it.kcal} แคล · {it.category} · {it.cuisine}
                        {it.image_url ? " · มีรูป 🖼️" : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteDupe(g, it)}
                      disabled={delId === it.id}
                      className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {delId === it.id ? "..." : "ลบ"}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
