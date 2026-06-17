import Navbar from "@/components/Navbar";

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <Navbar />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</div>
    </div>
  );
}
