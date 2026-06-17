"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

const links = [
  { href: "/home", label: "หน้าหลัก" },
  { href: "/menu", label: "เมนูอาหาร" },
  { href: "/delivery", label: "สั่งอาหาร" },
  { href: "/calculate", label: "คำนวณแคล" },
  { href: "/planner", label: "จัดมื้ออาหาร" },
  { href: "/weight", label: "น้ำหนัก" },
  { href: "/history", label: "ประวัติ" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-100 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/home" className="flex items-center gap-2 font-bold text-zinc-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-lg">
            🥗
          </span>
          NCE LifeStyle
        </Link>

        {/* เมนูจอใหญ่ */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand text-zinc-900 dark:text-zinc-950"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <ThemeToggle />
          <Link
            href="/profile"
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-sm hover:bg-zinc-200"
            title="โปรไฟล์"
          >
            👤
          </Link>
        </div>

        {/* ปุ่มฝั่งขวาจอมือถือ */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-100"
            aria-label="เปิดเมนู"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* เมนู dropdown จอมือถือ */}
      {open && (
        <div className="border-t border-zinc-100 px-4 py-2 md:hidden">
          {[...links, { href: "/profile", label: "โปรไฟล์" }].map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? "bg-brand text-zinc-900 dark:text-zinc-950" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
