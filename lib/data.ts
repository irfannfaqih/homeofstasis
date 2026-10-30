import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { samplePortalContent } from "@/lib/sample-data";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Marketplace, PortalContent, Promo, SiteSettings } from "@/lib/types";

type Row = Record<string, unknown>;

function publicAssetUrl(client: SupabaseClient, path: unknown) {
  if (typeof path !== "string" || path.length === 0) return null;
  if (path.startsWith("/")) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return client.storage.from("portal-assets").getPublicUrl(path).data.publicUrl;
}

async function fetchContent(client: SupabaseClient, includeInactive: boolean): Promise<PortalContent> {
  let heroQuery = client.from("hero_slides").select("*").order("sort_order");
  let marketplaceQuery = client.from("marketplaces").select("*").order("sort_order");
  let promoQuery = client.from("promos").select("*").order("sort_order");
  let navigationQuery = client.from("navigation_links").select("*").order("sort_order");

  if (!includeInactive) {
    heroQuery = heroQuery.eq("is_active", true);
    marketplaceQuery = marketplaceQuery.eq("is_active", true);
    promoQuery = promoQuery.eq("is_active", true);
    navigationQuery = navigationQuery.eq("is_active", true);
  }

  const [heroResult, marketplaceResult, promoResult, navigationResult, settingsResult] = await Promise.all([
    heroQuery,
    marketplaceQuery,
    promoQuery,
    navigationQuery,
    client.from("site_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const error = heroResult.error ?? marketplaceResult.error ?? promoResult.error ?? navigationResult.error ?? settingsResult.error;
  if (error) throw error;

  const promosByMarketplace = new Map<number, Promo[]>();
  for (const raw of (promoResult.data ?? []) as Row[]) {
    const marketplaceId = Number(raw.marketplace_id);
    const promo: Promo = {
      id: Number(raw.id),
      title: String(raw.title),
      destinationUrl: String(raw.destination_url),
      sortOrder: Number(raw.sort_order),
      isActive: Boolean(raw.is_active),
    };
    promosByMarketplace.set(marketplaceId, [...(promosByMarketplace.get(marketplaceId) ?? []), promo]);
  }

  const marketplaces: Marketplace[] = ((marketplaceResult.data ?? []) as Row[]).map((raw) => ({
    id: Number(raw.id),
    name: String(raw.name),
    displayName: String(raw.display_name),
    logoUrl: publicAssetUrl(client, raw.logo_path),
    sortOrder: Number(raw.sort_order),
    isActive: Boolean(raw.is_active),
    promos: promosByMarketplace.get(Number(raw.id)) ?? [],
  }));

  const rawSettings = (settingsResult.data ?? {}) as Row;
  const settings: SiteSettings = {
    siteName: String(rawSettings.site_name ?? "Home of Stasis"),
    headerLogoUrl: publicAssetUrl(client, rawSettings.header_logo_path),
    carouselIntervalSeconds: Number(rawSettings.carousel_interval_seconds ?? 5),
    searchScope: rawSettings.search_scope === "marketplaces_only" ? "marketplaces_only" : "marketplaces_and_promos",
    linkTarget: rawSettings.link_target === "same_tab" ? "same_tab" : "new_tab",
    hideEmptyMarketplaces: Boolean(rawSettings.hide_empty_marketplaces ?? true),
    footerTitle: String(rawSettings.footer_title ?? "Home of Stasis"),
    footerDescription: typeof rawSettings.footer_description === "string" ? rawSettings.footer_description : null,
    footerLogoUrl: publicAssetUrl(client, rawSettings.footer_logo_path),
    copyrightText: String(rawSettings.copyright_text ?? "© 2026 Home of Stasis"),
    termsLabel: String(rawSettings.terms_label ?? "Terms & Policies"),
    termsUrl: typeof rawSettings.terms_url === "string" ? rawSettings.terms_url : null,
  };

  return {
    source: "supabase",
    heroSlides: ((heroResult.data ?? []) as Row[]).map((raw) => ({
      id: Number(raw.id),
      title: String(raw.title),
      description: typeof raw.description === "string" ? raw.description : null,
      imageUrl: publicAssetUrl(client, raw.image_path),
      altText: String(raw.alt_text ?? ""),
      destinationUrl: typeof raw.destination_url === "string" ? raw.destination_url : null,
      sortOrder: Number(raw.sort_order),
      isActive: Boolean(raw.is_active),
    })),
    marketplaces: settings.hideEmptyMarketplaces && !includeInactive
      ? marketplaces.filter((marketplace) => marketplace.promos.length > 0)
      : marketplaces,
    navigationLinks: ((navigationResult.data ?? []) as Row[]).map((raw) => ({
      id: Number(raw.id),
      label: String(raw.label),
      destinationUrl: String(raw.destination_url),
      sortOrder: Number(raw.sort_order),
      isActive: Boolean(raw.is_active),
    })),
    settings,
  };
}

export async function getPublicPortalContent() {
  const client = createPublicClient();
  if (!client) return samplePortalContent;
  try {
    const content = await fetchContent(client, false);
    const currentHeroes = content.heroSlides.filter(
      (slide) => slide.imageUrl && !slide.imageUrl.includes("placehold.co"),
    );
    const currentHeroUrls = new Set(currentHeroes.map((slide) => slide.imageUrl));
    const nextSortOrder = Math.max(-1, ...currentHeroes.map((slide) => slide.sortOrder)) + 1;
    const bundledHeroes = samplePortalContent.heroSlides
      .filter((slide) => !currentHeroUrls.has(slide.imageUrl))
      .map((slide, index) => ({
        ...slide,
        id: -(index + 1),
        sortOrder: nextSortOrder + index,
      }));
    return { ...content, heroSlides: [...currentHeroes, ...bundledHeroes] };
  } catch (error) {
    console.warn("Failed to load Supabase portal content; using bundled fallback.", error);
    return samplePortalContent;
  }
}

export async function getAdminPortalContent() {
  const client = await createServerClient();
  if (!client) return samplePortalContent;
  return fetchContent(client, true);
}

export async function getAdminSession() {
  const client = await createServerClient();
  if (!client) return { configured: false, isAdmin: true, email: "demo@stasis.local" };

  const { data: { user }, error } = await client.auth.getUser();
  return {
    configured: true,
    isAdmin: !error && user?.app_metadata?.role === "admin",
    email: user?.email ?? null,
  };
}
