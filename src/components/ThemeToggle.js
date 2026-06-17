"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // อ่านสถานะธีมที่สคริปต์ใน <head> ตั้งไว้แล้ว (กันกระพริบ)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* localStorage อาจถูกปิด — ข้ามไป */
    }
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      title={dark ? "โหมดสว่าง" : "โหมดมืด"}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-base hover:bg-zinc-200"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
