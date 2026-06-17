import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// รีเฟรช session ของผู้ใช้ในทุก request และกันหน้าแอปไว้สำหรับคนที่ล็อกอินแล้ว
export async function proxy(request) {
  let response = NextResponse.next({ request });

  // ถ้ายังไม่ได้ตั้งค่า env ของ Supabase ให้ปล่อยผ่าน (ตอนกำลัง dev หน้าตา)
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // หน้าแอปที่ต้องล็อกอินก่อน
  const protectedPrefixes = [
    "/home",
    "/menu",
    "/delivery",
    "/calculate",
    "/planner",
    "/weight",
    "/history",
    "/profile",
    "/admin",
  ];
  const path = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // ทุก path ยกเว้นไฟล์ static และ image optimization
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
