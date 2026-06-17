"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-brand px-6 py-12">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-3xl">
            🥗
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">เข้าสู่ระบบ</h1>
          <p className="mt-1 text-sm text-zinc-500">NCE LifeStyle</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              อีเมล
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              รหัสผ่าน
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand/40"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-zinc-600">
              <input type="checkbox" className="accent-brand-dark" /> จำฉันไว้
            </label>
            <Link href="#" className="font-medium text-zinc-500 hover:text-zinc-800">
              ลืมรหัสผ่าน?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="block w-full rounded-full bg-zinc-900 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="font-semibold text-zinc-900 hover:underline">
            สมัครสมาชิก
          </Link>
        </p>
      </div>
    </main>
  );
}
