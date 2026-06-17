// จำตำแหน่งล่าสุดไว้ใน localStorage ของเบราว์เซอร์
const KEY = "nce_location";

export function saveLocation(lat, lng, label) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ lat: Number(lat), lng: Number(lng), label: label || "" })
    );
  } catch {
    // SSR หรือ storage ถูกปิด — ข้ามได้
  }
}

export function loadLocation() {
  try {
    const v = localStorage.getItem(KEY);
    const o = v ? JSON.parse(v) : null;
    if (o && typeof o.lat === "number" && typeof o.lng === "number") return o;
  } catch {
    // ข้าม
  }
  return null;
}

export function clearLocation() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ข้าม
  }
}
