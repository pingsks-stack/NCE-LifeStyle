// ตรวจสิทธิ์แอดมินฝั่งเซิร์ฟเวอร์ — ใช้ร่วมกันทุก API ของแอดมิน
// แอดมิน = บัญชีเริ่มต้น admin@nce.com หรือผู้ใช้ที่ profiles.is_admin = true
import { createClient } from "@/lib/supabase/server";

export const ADMIN_EMAIL = "admin@nce.com";

export async function getAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false };

  let isAdmin = user.email === ADMIN_EMAIL;
  if (!isAdmin) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = !!prof?.is_admin;
  }
  return { user, isAdmin };
}
