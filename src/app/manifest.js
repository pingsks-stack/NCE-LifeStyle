// PWA manifest (Next App Router metadata route) — ทำให้ติดตั้งบนมือถือ/เดสก์ท็อปได้
export default function manifest() {
  return {
    name: "NCE LifeStyle — คำนวณแคลและวางแผนมื้ออาหาร",
    short_name: "NCE LifeStyle",
    description:
      "คำนวณพลังงาน สารอาหาร และวางแผนมื้ออาหารในแต่ละวัน",
    start_url: "/home",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffd60a",
    lang: "th",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
