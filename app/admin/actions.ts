"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 6) return { error: "Email atau password belum valid." };

  const client = await createClient();
  if (!client) return { error: "Supabase belum dikonfigurasi. Gunakan tombol Mode Demo." };

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email atau password salah." };

  const { data: { user } } = await client.auth.getUser();
  if (user?.app_metadata?.role !== "admin") {
    await client.auth.signOut();
    return { error: "Akun ini tidak memiliki akses admin." };
  }

  redirect("/admin/cms");
}

export async function logoutAction() {
  const client = await createClient();
  if (client) await client.auth.signOut();
  redirect("/admin");
}
