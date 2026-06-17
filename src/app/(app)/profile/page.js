"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import LogoutButton from "@/components/LogoutButton";

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState(null);
  const [mealCount, setMealCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setEmail(user.email);

      const [{ data: prof }, { count: meals }, { count: favs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("meal_entries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("favorites")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      setProfile(prof);
      setMealCount(meals ?? 0);
      setFavCount(favs ?? 0);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <p className="py-10 text-center text-zinc-400">กำลังโหลดโปรไฟล์...</p>;
  }

  const displayName = profile?.full_name || profile?.username || "ผู้ใช้ใหม่";
  const stats = [
    { label: "มื้อที่บันทึก", value: mealCount },
    { label: "เมนูโปรด", value: favCount },
    { label: "เป้าหมาย/วัน", value: `${profile?.daily_goal_kcal ?? 1800}` },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="h-24 bg-brand" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex items-end gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-zinc-100 text-4xl">
              {profile?.is_admin ? "👑" : "👤"}
            </div>
            <div className="pb-1">
              <h1 className="text-xl font-bold text-zinc-900">{displayName}</h1>
              <p className="text-sm text-zinc-500">
                @{profile?.username || "user"}
                {profile?.is_admin && (
                  <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-zinc-800 dark:text-zinc-950">
                    แอดมิน
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-zinc-50 p-3 text-center">
                <div className="text-lg font-bold text-zinc-900">{s.value}</div>
                <div className="text-xs text-zinc-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-zinc-900">ข้อมูลส่วนตัว</h2>
        <dl className="divide-y divide-zinc-100 text-sm">
          {[
            ["อีเมล", email],
            ["อายุ", profile?.age ? `${profile.age} ปี` : "ยังไม่ระบุ"],
            ["อาชีพ", profile?.job || "ยังไม่ระบุ"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-3">
              <dt className="text-zinc-500">{k}</dt>
              <dd className="font-medium text-zinc-800">{v}</dd>
            </div>
          ))}
        </dl>

        {profile?.is_admin && (
          <Link
            href="/admin"
            className="mt-5 flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-brand-dark dark:text-zinc-950"
          >
            👑 จัดการระบบ (แอดมิน)
          </Link>
        )}

        <div className="mt-3 flex gap-3">
          <Link
            href="/profile/edit"
            className="flex-1 rounded-full bg-zinc-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-zinc-700"
          >
            แก้ไขโปรไฟล์
          </Link>
          <LogoutButton className="flex-1 rounded-full border border-zinc-200 px-4 py-2.5 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-50" />
        </div>
      </div>
    </div>
  );
}
