import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
});

export const metadata = {
  title: "NCE LifeStyle — คำนวณแคลและวางแผนมื้ออาหาร",
  description:
    "NCE LifeStyle เว็บแอปคำนวณพลังงาน สารอาหาร และวางแผนมื้ออาหารในแต่ละวัน",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "NCE LifeStyle", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#ffd60a",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* ตั้งธีมก่อนวาดหน้า กันอาการกระพริบ (FOUC) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
