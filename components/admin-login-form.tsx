"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/admin/actions";
import { StasisLogo } from "@/components/stasis-logo";
import styles from "./admin-login.module.css";

const initialState: LoginState = { error: null };

export function AdminLoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return (
    <main className={styles.page}>
      <form className={styles.card} action={action}>
        <StasisLogo size="admin" gradient />
        <div><span className={`${styles.eyebrow} uiContextLabel`}>Pengelolaan konten</span><h1>Masuk ke CMS</h1><p>Kelola konten yang tampil pada Public Portal.</p></div>
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" minLength={6} required /></label>
        {state.error && <p className={styles.error} role="alert">{state.error}</p>}
        <button className={styles.primaryButton} type="submit" disabled={pending || !configured}>{pending ? "Memeriksa..." : "Masuk"}</button>
        {!configured && <><p className={styles.notice}>Supabase belum terhubung. Mode demo tidak menyimpan perubahan.</p><Link className={styles.demoButton} href="/admin/cms">Masuk Mode Demo</Link></>}
      </form>
    </main>
  );
}
