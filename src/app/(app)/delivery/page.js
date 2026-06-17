"use client";

import { useEffect, useState } from "react";
import { PROVINCE_GROUPS } from "@/lib/provinces";
import { clearLocation, loadLocation, saveLocation } from "@/lib/location";

const CATEGORIES = [
  { name: "อาหารตามสั่ง", emoji: "🍳" },
  { name: "ก๋วยเตี๋ยว", emoji: "🍜" },
  { name: "อาหารทะเล", emoji: "🦞" },
  { name: "หมูกระทะ", emoji: "🥓" },
  { name: "ชาบู/สุกี้", emoji: "🍲" },
  { name: "ปิ้งย่าง", emoji: "🍢" },
  { name: "ซูชิ", emoji: "🍣" },
  { name: "พิซซ่า", emoji: "🍕" },
  { name: "เบอร์เกอร์", emoji: "🍔" },
  { name: "ของหวาน", emoji: "🍰" },
  { name: "ชานมไข่มุก", emoji: "🧋" },
  { name: "กาแฟ/คาเฟ่", emoji: "☕" },
];

export default function DeliveryPage() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [coords, setCoords] = useState(null);
  const [activeCat, setActiveCat] = useState("");
  const [province, setProvince] = useState("");
  const [placeLabel, setPlaceLabel] = useState("");

  // โหลดตำแหน่งที่จำไว้ตอนเข้าหน้า (อ่านจาก localStorage หลัง mount)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = loadLocation();
    if (!saved) return;
    setCoords({ lat: saved.lat, lng: saved.lng });
    setPlaceLabel(saved.label || "ตำแหน่งที่บันทึกไว้");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ขอพิกัดจาก GPS (ครั้งแรก) แล้ว callback
  function withLocation(cb) {
    if (coords) {
      cb(coords);
      return;
    }
    if (!navigator.geolocation) {
      setStatus("เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง ลองเลือกจังหวัดแทน");
      return;
    }
    setStatus("📍 กำลังตรวจตำแหน่งของคุณ...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        setProvince("");
        setPlaceLabel("ตำแหน่งของคุณ");
        saveLocation(c.lat, c.lng, "ตำแหน่งของคุณ");
        cb(c);
      },
      () => setStatus("ไม่ได้รับสิทธิ์ตำแหน่ง — กดอนุญาต หรือเลือกจังหวัดด้านล่าง"),
      { timeout: 8000 }
    );
  }

  // เลือกจังหวัดแทน GPS
  function onSelectProvince(e) {
    const val = e.target.value;
    setProvince(val);
    if (!val) return;
    const [lat, lng, name] = val.split(",");
    const c = { lat: Number(lat), lng: Number(lng) };
    setCoords(c);
    setPlaceLabel(`จ.${name}`);
    saveLocation(c.lat, c.lng, `จ.${name}`);
    fetchRestaurants(c, activeCat);
  }

  async function fetchRestaurants(c, q) {
    setLoading(true);
    setStatus("🔎 กำลังค้นหาร้านใกล้คุณ...");
    setActiveCat(q || "");
    try {
      const params = new URLSearchParams({ lat: c.lat, lng: c.lng });
      if (q) params.set("q", q);
      const res = await fetch(`/api/restaurants?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "error");
      setRestaurants(data.restaurants || []);
      setStatus((data.restaurants || []).length ? `พบ ${data.restaurants.length} ร้าน` : "ไม่พบร้าน");
    } catch {
      setStatus("ดึงรายชื่อร้านไม่ได้ตอนนี้ ลองใหม่อีกครั้ง");
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">สั่งอาหารเดลิเวอรี</h1>
        <p className="text-sm text-zinc-500">ร้านยอดนิยมใกล้ตำแหน่งคุณ แล้วกดสั่งผ่าน Wongnai</p>
      </div>

      {/* ค้นร้านใกล้ฉัน */}
      <section className="rounded-3xl bg-brand p-6 text-center dark:bg-neutral-800">
        <div className="text-4xl">🔥</div>
        <h2 className="mt-2 text-xl font-bold text-zinc-900">ร้านเด็ดใกล้ฉัน</h2>
        <p className="mt-1 text-sm text-zinc-700">ร้านยอดนิยมที่ส่งถึงตำแหน่งคุณตอนนี้</p>
        <button
          onClick={() => withLocation((c) => fetchRestaurants(c, ""))}
          disabled={loading}
          className="mt-4 rounded-full bg-zinc-900 px-6 py-3 font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          📍 ค้นหาร้านใกล้ฉัน
        </button>

        {/* ทางเลือก: เลือกจังหวัด (ไม่ต้องแชร์ตำแหน่ง) */}
        <div className="mx-auto mt-4 flex max-w-xs items-center gap-2">
          <span className="h-px flex-1 bg-zinc-900/15" />
          <span className="text-xs text-zinc-700">หรือไม่สะดวกแชร์ตำแหน่ง</span>
          <span className="h-px flex-1 bg-zinc-900/15" />
        </div>
        <select
          value={province}
          onChange={onSelectProvince}
          className="mx-auto mt-3 block w-full max-w-xs rounded-full border-0 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 outline-none"
        >
          <option value="">— เลือกจังหวัด —</option>
          {PROVINCE_GROUPS.map((g) => (
            <optgroup key={g.region} label={g.region}>
              {g.provinces.map((p) => (
                <option key={p.name} value={`${p.lat},${p.lng},${p.name}`}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {placeLabel && (
          <p className="mt-3 text-sm text-zinc-700">
            📍 ตำแหน่ง: <b>{placeLabel}</b>{" "}
            <button
              onClick={() => {
                clearLocation();
                setCoords(null);
                setProvince("");
                setPlaceLabel("");
                setRestaurants([]);
                setStatus("ล้างตำแหน่งแล้ว เลือกใหม่ได้เลย");
              }}
              className="ml-1 underline hover:text-zinc-900"
            >
              เปลี่ยน
            </button>
          </p>
        )}
        {status && <p className="mt-2 text-sm font-medium text-zinc-700">{status}</p>}
      </section>

      {/* หมวดหมู่ */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-zinc-900">เลือกตามประเภทอาหาร</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <button
              key={c.name}
              onClick={() => withLocation((co) => fetchRestaurants(co, c.name))}
              className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md ${
                activeCat === c.name ? "bg-brand dark:bg-neutral-700" : "bg-white"
              }`}
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-xs font-medium text-zinc-600">{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* รายชื่อร้าน */}
      {restaurants.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-900">
            {activeCat ? `ร้าน${activeCat}` : "ร้านยอดนิยม"}
            {placeLabel ? ` · ${placeLabel}` : ""}
          </h2>
          {restaurants.map((r, i) => (
            <div key={r.url} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <RestoAvatar
                image={r.image}
                emoji={CATEGORIES.find((c) => c.name === activeCat)?.emoji || "🍽️"}
                rank={i + 1}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-zinc-900">{r.name}</div>
              </div>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
              >
                🛵 สั่ง
              </a>
            </div>
          ))}
        </section>
      )}

      <p className="text-center text-xs text-zinc-400">
        ข้อมูลร้านใช้ช่วงพัฒนา · ตอนเปิดตัวจริงจะย้ายไปใช้ Google Places
      </p>
    </div>
  );
}

function RestoAvatar({ image, emoji, rank }) {
  const [err, setErr] = useState(false);
  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-brand/25">
      {image && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setErr(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-2xl">{emoji}</div>
      )}
      <span className="absolute left-0 top-0 flex h-5 w-5 items-center justify-center rounded-br-lg bg-zinc-900 text-[10px] font-bold text-white">
        {rank}
      </span>
    </div>
  );
}
