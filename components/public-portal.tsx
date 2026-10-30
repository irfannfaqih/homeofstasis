"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PortalContent } from "@/lib/types";
import { StasisLogo } from "@/components/stasis-logo";
import styles from "./public-portal.module.css";

type Props = { content: PortalContent };
type Hero = PortalContent["heroSlides"][number];
type Marketplace = PortalContent["marketplaces"][number];

const HERO_SLIDE_DURATION_MS = 560;

function marketplaceToneClass(name: string) {
  const normalized = name.toLocaleLowerCase("id-ID");
  if (normalized.includes("shopee")) return styles.marketplaceShopee;
  if (normalized.includes("tokopedia")) return styles.marketplaceTokopedia;
  if (normalized.includes("tiktok")) return styles.marketplaceTiktok;
  return styles.marketplaceDefault;
}

function marketplaceCategoryRank(name: string) {
  const normalized = name.toLocaleLowerCase("id-ID");
  if (normalized.includes("shopee")) return 0;
  if (normalized.includes("tiktok")) return 1;
  if (normalized.includes("tokopedia")) return 2;
  return 3;
}

function marketplaceCategoryLabel(name: string) {
  return name.toLocaleLowerCase("id-ID").includes("tiktok") ? "Tiktok" : name;
}

function countryName(marketplace: Marketplace, title: string) {
  const prefixes = [marketplace.displayName, marketplace.name].sort((a, b) => b.length - a.length);
  const normalizedTitle = title.trim();
  const lowerTitle = normalizedTitle.toLocaleLowerCase("id-ID");
  for (const prefix of prefixes) {
    const normalizedPrefix = prefix.trim();
    if (lowerTitle.startsWith(`${normalizedPrefix.toLocaleLowerCase("id-ID")} `)) {
      return normalizedTitle.slice(normalizedPrefix.length).trim();
    }
  }
  return normalizedTitle;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
}

function MenuIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>;
}

function Brand({ large = false }: { large?: boolean }) {
  return <StasisLogo size={large ? "large" : "small"} priority={!large} />;
}

function MarketplaceIcon({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const normalized = name.toLowerCase();
  const fallbackLogoUrl = normalized.includes("shopee")
    ? "/marketplace-icons/shopee.svg"
    : normalized.includes("tiktok")
      ? "/marketplace-icons/tiktok.svg"
      : normalized.includes("tokopedia")
        ? "/marketplace-icons/tokopedia.svg"
        : null;
  const resolvedLogoUrl = logoUrl ?? fallbackLogoUrl;

  if (resolvedLogoUrl) return <span className={styles.marketLogo} style={{ backgroundImage: `url(${resolvedLogoUrl})` }} aria-hidden="true" />;
  return <span className={`${styles.marketLogo} ${styles.marketLogoFallback}`} aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>;
}

export function PublicPortal({ content }: Props) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [previousHeroIndex, setPreviousHeroIndex] = useState<number | null>(null);
  const [heroDirection, setHeroDirection] = useState<-1 | 1>(1);
  const [autoplayCycle, setAutoplayCycle] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const heroIndexRef = useRef(0);
  const heroSlidingRef = useRef(false);
  const heroAnimationTimerRef = useRef<number | null>(null);
  const slides = content.heroSlides;
  const currentHero = slides[heroIndex] ?? slides[0];
  const target = content.settings.linkTarget === "new_tab" ? "_blank" : undefined;

  const changeHero = useCallback((direction: -1 | 1, manual = false) => {
    if (slides.length < 2 || heroSlidingRef.current) return;
    const currentIndex = heroIndexRef.current;
    const nextIndex = (currentIndex + direction + slides.length) % slides.length;

    heroSlidingRef.current = true;
    setPreviousHeroIndex(currentIndex);
    setHeroDirection(direction);
    heroIndexRef.current = nextIndex;
    setHeroIndex(nextIndex);
    if (manual) setAutoplayCycle((cycle) => cycle + 1);

    if (heroAnimationTimerRef.current) window.clearTimeout(heroAnimationTimerRef.current);
    heroAnimationTimerRef.current = window.setTimeout(() => {
      setPreviousHeroIndex(null);
      heroSlidingRef.current = false;
    }, HERO_SLIDE_DURATION_MS);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(
      () => changeHero(1),
      content.settings.carouselIntervalSeconds * 1000,
    );
    return () => window.clearInterval(timer);
  }, [autoplayCycle, changeHero, content.settings.carouselIntervalSeconds, slides.length]);

  useEffect(() => () => {
    if (heroAnimationTimerRef.current) window.clearTimeout(heroAnimationTimerRef.current);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen, searchOpen]);

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const marketplaceResults = content.marketplaces.map((marketplace) => ({
      key: `marketplace-${marketplace.id}`,
      type: "Marketplace",
      label: marketplace.displayName,
      href: `#marketplace-${marketplace.id}`,
      external: false,
    }));
    const countryMarketplaceResults = content.settings.searchScope === "marketplaces_only" ? [] : content.marketplaces.flatMap((marketplace) => marketplace.promos.map((promo) => ({
      key: `promo-${promo.id}`,
      type: marketplace.displayName,
      label: `${marketplace.displayName} ${countryName(marketplace, promo.title)}`,
      href: promo.destinationUrl,
      external: true,
    })));
    const results = [...marketplaceResults, ...countryMarketplaceResults];
    return normalized ? results.filter((item) => `${item.type} ${item.label}`.toLowerCase().includes(normalized)) : marketplaceResults;
  }, [content.marketplaces, content.settings.searchScope, query]);

  return (
    <div className={styles.pageShell}>
      <header className={styles.header}>
        <a href="#top" aria-label="Home of Stasis"><Brand /></a>
        <div className={styles.headerActions}>
          <button type="button" aria-label="Buka pencarian" onClick={() => setSearchOpen(true)}><SearchIcon /></button>
          <button type="button" aria-label="Buka menu" onClick={() => setMenuOpen(true)}><MenuIcon /></button>
        </div>
      </header>

      <main id="top">
        <section className={styles.hero} aria-label="Hero carousel">
          {previousHeroIndex !== null && slides[previousHeroIndex] && <HeroItem hero={slides[previousHeroIndex]} target={target} active={false} className={`${styles.heroSlidePrevious} ${heroDirection === 1 ? styles.heroSlideLeaveLeft : styles.heroSlideLeaveRight}`} />}
          {currentHero ? <HeroItem hero={currentHero} target={target} active className={`${styles.heroSlideCurrent} ${previousHeroIndex !== null ? heroDirection === 1 ? styles.heroSlideEnterRight : styles.heroSlideEnterLeft : ""}`} /> : <div className={`${styles.heroSlide} ${styles.heroSlideCurrent}`}><HeroCopy title="Home of Stasis" description="Belum ada hero aktif." /></div>}

          {slides.length > 1 && <>
            <button className={`${styles.heroArrow} ${styles.heroArrowPrevious}`} type="button" aria-label="Hero sebelumnya" onClick={() => changeHero(-1, true)}>‹</button>
            <button className={`${styles.heroArrow} ${styles.heroArrowNext}`} type="button" aria-label="Hero berikutnya" onClick={() => changeHero(1, true)}>›</button>
          </>}
        </section>

        <section className={styles.intro}>
          <h1>{content.settings.siteName}</h1>
          <nav className={styles.marketplaceNav} aria-label="Navigasi marketplace">
            {[...content.marketplaces].sort((a, b) => marketplaceCategoryRank(a.name) - marketplaceCategoryRank(b.name)).map((marketplace) => <a className={marketplaceToneClass(marketplace.name)} key={marketplace.id} href={`#marketplace-${marketplace.id}`}><MarketplaceIcon name={marketplace.name} logoUrl={marketplace.logoUrl} /><span>{marketplaceCategoryLabel(marketplace.name)}</span></a>)}
          </nav>
        </section>

        <div className={styles.marketplaceSections}>
          {content.marketplaces.map((marketplace) => (
            <section className={`${styles.marketplaceSection} ${marketplaceToneClass(marketplace.name)}`} id={`marketplace-${marketplace.id}`} key={marketplace.id}>
              <div className={styles.sectionHeading}><h2>{marketplace.name}</h2></div>
              <div className={styles.promoList}>
                {marketplace.promos.map((promo) => {
                  const country = countryName(marketplace, promo.title);
                  return <a className={styles.promoButton} id={`promo-${promo.id}`} key={promo.id} href={promo.destinationUrl} target={target} rel={target ? "noreferrer" : undefined} aria-label={`Buka ${marketplace.displayName} ${country}`}>
                    <span className={styles.promoIdentity}><strong>{marketplace.displayName}</strong><small>{country}</small></span>
                    <span className={styles.promoArrow} aria-hidden="true">→</span>
                  </a>;
                })}
              </div>
            </section>
          ))}
        </div>
      </main>

      <footer className={styles.footer} id="about">
        <div className={styles.footerInfo}><h2>{content.settings.footerTitle}</h2>{content.settings.footerDescription && <p>{content.settings.footerDescription}</p>}</div>
        <div className={styles.footerBottom}><Brand large /><div><small>{content.settings.copyrightText}</small>{content.settings.termsUrl ? <a href={content.settings.termsUrl} target={target} rel={target ? "noreferrer" : undefined}>{content.settings.termsLabel}</a> : <span>{content.settings.termsLabel}</span>}</div></div>
      </footer>

      {(menuOpen || searchOpen) && <button className={styles.backdrop} type="button" aria-label="Tutup panel" onClick={() => { setMenuOpen(false); setSearchOpen(false); }} />}
      <aside className={`${styles.drawer} ${menuOpen ? styles.openPanel : ""}`} aria-hidden={!menuOpen}>
        <div className={styles.panelHeading}><strong>Menu</strong><button type="button" aria-label="Tutup menu" onClick={() => setMenuOpen(false)}><CloseIcon /></button></div>
        <nav><a href="#top" onClick={() => setMenuOpen(false)}>Home</a>{content.marketplaces.map((marketplace) => <a key={marketplace.id} href={`#marketplace-${marketplace.id}`} onClick={() => setMenuOpen(false)}>{marketplace.displayName}</a>)}{content.navigationLinks.map((link) => <a key={link.id} href={link.destinationUrl} onClick={() => setMenuOpen(false)}>{link.label}</a>)}</nav>
      </aside>

      <section className={`${styles.searchPanel} ${searchOpen ? styles.openSearch : ""}`} aria-hidden={!searchOpen}>
        <div className={styles.panelHeading}><div><span className={`${styles.eyebrow} uiContextLabel`}>Pencarian</span><h2>Cari marketplace atau negara</h2></div><button type="button" aria-label="Tutup pencarian" onClick={() => setSearchOpen(false)}><CloseIcon /></button></div>
        <label className={styles.searchField}><SearchIcon /><span className={styles.srOnly}>Kata pencarian</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Contoh: Shopee Malaysia" autoFocus={searchOpen} /></label>
        <div className={styles.searchResults}>{searchResults.length ? searchResults.map((item) => <a key={item.key} href={item.href} target={item.external ? target : undefined} rel={item.external && target ? "noreferrer" : undefined} onClick={() => setSearchOpen(false)}><span>{item.type}</span><strong>{item.label}</strong></a>) : <p>Tidak ada konten yang ditemukan.</p>}</div>
      </section>
    </div>
  );
}

function HeroItem({ hero, target, active, className }: { hero: Hero; target?: "_blank"; active: boolean; className: string }) {
  const props = {
    className: `${styles.heroSlide} ${hero.destinationUrl ? styles.heroSlideClickable : ""} ${className}`,
    style: hero.imageUrl ? { backgroundImage: `url(${hero.imageUrl})` } : undefined,
    "aria-hidden": !active,
  };
  return hero.destinationUrl ? <a {...props} href={hero.destinationUrl} target={target} rel={target ? "noreferrer" : undefined} tabIndex={active ? 0 : -1}><HeroCopy title={hero.title} description={hero.description} /></a>
    : <div {...props}><HeroCopy title={hero.title} description={hero.description} /></div>;
}

function HeroCopy({ title, description }: { title: string; description: string | null }) {
  return <span className={styles.heroCopy}><strong>{title}</strong>{description && <small>{description}</small>}</span>;
}
