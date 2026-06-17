import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-brand px-6 py-16 text-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand text-4xl">
          🥗
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          NCE LifeStyle
        </h1>
        <p className="mt-2 text-zinc-500">
          คำนวณพลังงาน สารอาหาร และวางแผนมื้ออาหารในแต่ละวัน
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-2xl bg-zinc-50 p-3">
            <div className="text-xl">🔢</div>
            <div className="mt-1 font-medium text-zinc-700">คำนวณแคล</div>
          </div>
          <div className="rounded-2xl bg-zinc-50 p-3">
            <div className="text-xl">🍱</div>
            <div className="mt-1 font-medium text-zinc-700">จัดมื้ออาหาร</div>
          </div>
          <div className="rounded-2xl bg-zinc-50 p-3">
            <div className="text-xl">📊</div>
            <div className="mt-1 font-medium text-zinc-700">ดูสถิติ</div>
          </div>
        </div>

        <Link
          href="/login"
          className="mt-8 block w-full rounded-full bg-zinc-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          เริ่มต้นใช้งาน
        </Link>

        <Link
          href="/register"
          className="mt-3 block text-sm font-medium text-zinc-500 hover:text-zinc-800"
        >
          ยังไม่มีบัญชี? สมัครสมาชิก
        </Link>
      </div>
    </main>
  );
}
