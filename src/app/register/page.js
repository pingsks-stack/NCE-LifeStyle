"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (password !== confirm) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    if (password.length < 6) {
      setError("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    setLoading(false);

    if (error) {
      setError("สมัครไม่สำเร็จ: " + error.message);
      return;
    }

    // ถ้าได้ session มาเลย = ล็อกอินอัตโนมัติ (ปิดยืนยันอีเมลไว้)
    if (data.session) {
      router.push("/home");
      router.refresh();
    } else {
      setInfo("สมัครสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี แล้วจึงเข้าสู่ระบบ");
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-brand px-6 py-12">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-3xl">
            🥗
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">สมัครสมาชิก</h1>
          <p className="mt-1 text-sm text-zinc-500">
            เริ่มต้นดูแลสุขภาพกับ NCE LifeStyle
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              ชื่อผู้ใช้
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand/40"
            />
          </div>
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
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              ยืนยันรหัสผ่าน
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand/40"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="block w-full rounded-full bg-zinc-900 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/login" className="font-semibold text-zinc-900 hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </main>
  );
}
