import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminSession } from "@/lib/data";

export const metadata = {
  title: "Login CMS — Home of Stasis",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session.configured && session.isAdmin) redirect("/admin/cms");
  return <AdminLoginForm configured={session.configured} />;
}
