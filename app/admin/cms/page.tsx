import { redirect } from "next/navigation";
import { logoutAction } from "@/app/admin/actions";
import { CmsEditor } from "@/components/cms-editor";
import { StasisLogo } from "@/components/stasis-logo";
import { getAdminPortalContent, getAdminSession } from "@/lib/data";
import styles from "./page.module.css";

export const metadata = {
  title: "CMS — Home of Stasis",
  robots: { index: false, follow: false },
};

export default async function CmsPage() {
  const session = await getAdminSession();
  if (session.configured && !session.isAdmin) redirect("/admin");
  const content = await getAdminPortalContent();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className="cmsOfficialBrand" href="/admin/cms" aria-label="Stasis CMS"><StasisLogo gradient /></a>
        <div className={styles.headerActions}>
          <span>{session.email}</span>
          <a href="/" target="_blank" rel="noreferrer">Lihat Portal ↗</a>
          {session.configured && <form action={logoutAction}><button>Keluar</button></form>}
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.pageTitle}>
          <div><span className="uiContextLabel">Pengelolaan konten</span><h1>Kelola Portal</h1><p>Edit hanya bagian yang tampil kepada customer.</p></div>
          <a href="/" target="_blank" rel="noreferrer">Preview Website</a>
        </div>
        <CmsEditor key={JSON.stringify(content)} content={content} />
      </main>
    </div>
  );
}
