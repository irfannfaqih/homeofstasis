export type HeroSlide = {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  altText: string;
  destinationUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type Promo = {
  id: number;
  title: string;
  destinationUrl: string;
  sortOrder: number;
  isActive: boolean;
};

export type Marketplace = {
  id: number;
  name: string;
  displayName: string;
  logoUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  promos: Promo[];
};

export type NavigationLink = {
  id: number;
  label: string;
  destinationUrl: string;
  sortOrder: number;
  isActive: boolean;
};

export type SiteSettings = {
  siteName: string;
  headerLogoUrl: string | null;
  carouselIntervalSeconds: number;
  searchScope: "marketplaces_and_promos" | "marketplaces_only";
  linkTarget: "new_tab" | "same_tab";
  hideEmptyMarketplaces: boolean;
  footerTitle: string;
  footerDescription: string | null;
  footerLogoUrl: string | null;
  copyrightText: string;
  termsLabel: string;
  termsUrl: string | null;
};

export type PortalContent = {
  heroSlides: HeroSlide[];
  marketplaces: Marketplace[];
  navigationLinks: NavigationLink[];
  settings: SiteSettings;
  source: "supabase" | "sample";
};
