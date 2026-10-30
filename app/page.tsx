import { PublicPortal } from "@/components/public-portal";
import { getPublicPortalContent } from "@/lib/data";

export default async function HomePage() {
  const content = await getPublicPortalContent();
  return <PublicPortal content={content} />;
}
