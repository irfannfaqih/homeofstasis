"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  deleteAction,
  reorderAction,
  saveHeroAction,
  saveMarketplaceAction,
  saveNavigationAction,
  savePromoAction,
  saveSettingsAction,
  toggleAction,
  type ReorderKind,
} from "@/app/admin/cms/actions";
import type { HeroSlide, Marketplace, NavigationLink, PortalContent, Promo } from "@/lib/types";
import styles from "./cms-editor.module.css";

type Result = { ok: boolean; message: string };
type EditorModal =
  | { kind: "hero"; item?: HeroSlide }
  | { kind: "marketplace"; item?: Marketplace }
  | { kind: "promo"; marketplaceId: number; item?: Promo }
  | { kind: "navigation"; item?: NavigationLink };

type DragState = { kind: ReorderKind; id: number; scope?: number } | null;
type DeleteTarget = { kind: ReorderKind; id: number; title: string; scope?: number };

const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;

function moveById<T extends { id: number }>(items: T[], sourceId: number, targetId: number) {
  const from = items.findIndex((item) => item.id === sourceId);
  const to = items.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((item, index) => ({ ...item, sortOrder: index }));
}

function reorderByStep<T extends { id: number }>(items: T[], id: number, direction: -1 | 1) {
  const index = items.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return items;
  return moveById(items, id, items[target].id);
}

function filePreview(formData: FormData, fallback: string | null) {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? URL.createObjectURL(file) : fallback;
}

function countryFieldValue(marketplace: Marketplace | undefined, title: string) {
  if (!marketplace) return title;
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

export function CmsEditor({ content }: { content: PortalContent }) {
  const router = useRouter();
  const [heroes, setHeroes] = useState(content.heroSlides);
  const [marketplaces, setMarketplaces] = useState(content.marketplaces);
  const [navigation, setNavigation] = useState(content.navigationLinks);
  const [openMarkets, setOpenMarkets] = useState<number[]>(content.marketplaces.slice(0, 1).map((item) => item.id));
  const [modal, setModal] = useState<EditorModal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [dragging, setDragging] = useState<DragState>(null);
  const [toast, setToast] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  const isDemo = content.source === "sample";

  const totalPromos = useMemo(() => marketplaces.reduce((total, item) => total + item.promos.length, 0), [marketplaces]);

  const finish = (result: Result, closeModal = false) => {
    setToast(result);
    if (result.ok && closeModal) setModal(null);
    if (!isDemo) router.refresh();
  };

  const persistOrder = (kind: ReorderKind, ids: number[]) => {
    startTransition(async () => finish(await reorderAction(kind, ids)));
  };

  const reorder = (kind: ReorderKind, sourceId: number, targetId: number, scope?: number) => {
    if (kind === "hero") {
      const next = moveById(heroes, sourceId, targetId);
      setHeroes(next);
      persistOrder(kind, next.map((item) => item.id));
    } else if (kind === "marketplace") {
      const next = moveById(marketplaces, sourceId, targetId);
      setMarketplaces(next);
      persistOrder(kind, next.map((item) => item.id));
    } else if (kind === "navigation") {
      const next = moveById(navigation, sourceId, targetId);
      setNavigation(next);
      persistOrder(kind, next.map((item) => item.id));
    } else if (scope) {
      let ids: number[] = [];
      setMarketplaces((current) => current.map((marketplace) => {
        if (marketplace.id !== scope) return marketplace;
        const promos = moveById(marketplace.promos, sourceId, targetId);
        ids = promos.map((item) => item.id);
        return { ...marketplace, promos };
      }));
      if (ids.length) persistOrder(kind, ids);
    }
  };

  const step = (kind: ReorderKind, id: number, direction: -1 | 1, scope?: number) => {
    if (kind === "hero") {
      const next = reorderByStep(heroes, id, direction);
      setHeroes(next); persistOrder(kind, next.map((item) => item.id));
    } else if (kind === "marketplace") {
      const next = reorderByStep(marketplaces, id, direction);
      setMarketplaces(next); persistOrder(kind, next.map((item) => item.id));
    } else if (kind === "navigation") {
      const next = reorderByStep(navigation, id, direction);
      setNavigation(next); persistOrder(kind, next.map((item) => item.id));
    } else if (scope) {
      let ids: number[] = [];
      setMarketplaces((current) => current.map((marketplace) => {
        if (marketplace.id !== scope) return marketplace;
        const promos = reorderByStep(marketplace.promos, id, direction);
        ids = promos.map((item) => item.id);
        return { ...marketplace, promos };
      }));
      if (ids.length) persistOrder(kind, ids);
    }
  };

  const toggle = (kind: ReorderKind, id: number, isActive: boolean, scope?: number) => {
    if (kind === "hero") setHeroes((items) => items.map((item) => item.id === id ? { ...item, isActive } : item));
    if (kind === "marketplace") setMarketplaces((items) => items.map((item) => item.id === id ? { ...item, isActive } : item));
    if (kind === "navigation") setNavigation((items) => items.map((item) => item.id === id ? { ...item, isActive } : item));
    if (kind === "promo" && scope) setMarketplaces((items) => items.map((item) => item.id === scope ? { ...item, promos: item.promos.map((promo) => promo.id === id ? { ...promo, isActive } : promo) } : item));
    startTransition(async () => finish(await toggleAction(kind, id, isActive)));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { kind, id, scope } = deleteTarget;
    startTransition(async () => {
      const result = await deleteAction(kind, id);
      if (result.ok) {
        if (kind === "hero") setHeroes((items) => items.filter((item) => item.id !== id));
        if (kind === "marketplace") setMarketplaces((items) => items.filter((item) => item.id !== id));
        if (kind === "navigation") setNavigation((items) => items.filter((item) => item.id !== id));
        if (kind === "promo" && scope) setMarketplaces((items) => items.map((item) => item.id === scope ? { ...item, promos: item.promos.filter((promo) => promo.id !== id) } : item));
        setDeleteTarget(null);
      }
      finish(result);
    });
  };

  const submitEditor = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const image = formData.get("image");
    if (image instanceof File && image.size > MAX_IMAGE_SIZE_BYTES) {
      setToast({ ok: false, message: "Ukuran gambar maksimal 3 MB." });
      return;
    }
    const activeModal = modal;
    startTransition(async () => {
      const action = activeModal.kind === "hero" ? saveHeroAction
        : activeModal.kind === "marketplace" ? saveMarketplaceAction
          : activeModal.kind === "promo" ? savePromoAction
            : saveNavigationAction;
      const result = await action(formData);
      if (result.ok && isDemo) applyDemoSave(activeModal, formData);
      finish(result, true);
    });
  };

  const applyDemoSave = (activeModal: EditorModal, formData: FormData) => {
    const newId = Date.now();
    if (activeModal.kind === "hero") {
      const item: HeroSlide = {
        id: activeModal.item?.id ?? newId,
        title: String(formData.get("title")),
        description: String(formData.get("description") || "") || null,
        imageUrl: filePreview(formData, activeModal.item?.imageUrl ?? null),
        altText: String(formData.get("altText")),
        destinationUrl: String(formData.get("destinationUrl") || "") || null,
        sortOrder: activeModal.item?.sortOrder ?? heroes.length,
        isActive: activeModal.item?.isActive ?? true,
      };
      setHeroes((items) => activeModal.item ? items.map((old) => old.id === item.id ? item : old) : [...items, item]);
    } else if (activeModal.kind === "marketplace") {
      const item: Marketplace = {
        id: activeModal.item?.id ?? newId,
        name: String(formData.get("name")),
        displayName: String(formData.get("displayName")),
        logoUrl: filePreview(formData, activeModal.item?.logoUrl ?? null),
        sortOrder: activeModal.item?.sortOrder ?? marketplaces.length,
        isActive: activeModal.item?.isActive ?? true,
        promos: activeModal.item?.promos ?? [],
      };
      setMarketplaces((items) => activeModal.item ? items.map((old) => old.id === item.id ? item : old) : [...items, item]);
    } else if (activeModal.kind === "promo") {
      const item: Promo = {
        id: activeModal.item?.id ?? newId,
        title: String(formData.get("title")),
        destinationUrl: String(formData.get("destinationUrl")),
        sortOrder: activeModal.item?.sortOrder ?? 999,
        isActive: activeModal.item?.isActive ?? true,
      };
      setMarketplaces((items) => items.map((marketplace) => marketplace.id === activeModal.marketplaceId
        ? { ...marketplace, promos: activeModal.item ? marketplace.promos.map((old) => old.id === item.id ? item : old) : [...marketplace.promos, { ...item, sortOrder: marketplace.promos.length }] }
        : marketplace));
    } else {
      const item: NavigationLink = {
        id: activeModal.item?.id ?? newId,
        label: String(formData.get("label")),
        destinationUrl: String(formData.get("destinationUrl")),
        sortOrder: activeModal.item?.sortOrder ?? navigation.length,
        isActive: activeModal.item?.isActive ?? true,
      };
      setNavigation((items) => activeModal.item ? items.map((old) => old.id === item.id ? item : old) : [...items, item]);
    }
  };

  const dropOn = (kind: ReorderKind, targetId: number, scope?: number) => {
    if (dragging?.kind === kind && dragging.scope === scope) reorder(kind, dragging.id, targetId, scope);
    setDragging(null);
  };

  return (
    <div className={styles.editor} aria-busy={pending}>
      <div className={styles.summary}>
        <div><span className="uiContextLabel">Hero</span><strong>{heroes.length}</strong></div>
        <div><span className="uiContextLabel">Marketplace</span><strong>{marketplaces.length}</strong></div>
        <div><span className="uiContextLabel">Link negara</span><strong>{totalPromos}</strong></div>
      </div>

      {isDemo && <div className={styles.demoNotice}><strong className="uiContextLabel">Mode demo</strong><span>Perubahan dapat dicoba, tetapi belum permanen sampai Supabase dihubungkan.</span></div>}
      {toast && <button type="button" className={`${styles.toast} ${toast.ok ? styles.toastSuccess : styles.toastError}`} onClick={() => setToast(null)}>{toast.message}<span>×</span></button>}

      <section className={styles.cmsSection}>
        <SectionTitle eyebrow="Konten utama" title="Hero carousel" description="Tarik kartu untuk mengubah urutan slide." onAdd={() => setModal({ kind: "hero" })} addLabel="Tambah Hero" />
        <div className={styles.cardList}>
          {heroes.map((hero, index) => <ContentCard key={hero.id} kind="hero" id={hero.id} index={index} total={heroes.length} title={hero.title} subtitle={hero.destinationUrl || "Tanpa link tujuan"} imageUrl={hero.imageUrl} isActive={hero.isActive} dragging={dragging?.kind === "hero" && dragging.id === hero.id} onDragStart={() => setDragging({ kind: "hero", id: hero.id })} onDrop={() => dropOn("hero", hero.id)} onStep={(direction) => step("hero", hero.id, direction)} onToggle={(value) => toggle("hero", hero.id, value)} onEdit={() => setModal({ kind: "hero", item: hero })} onDelete={() => setDeleteTarget({ kind: "hero", id: hero.id, title: hero.title })} />)}
        </div>
      </section>

      <section className={styles.cmsSection}>
        <SectionTitle eyebrow="Kanal penjualan" title="Marketplace per negara" description="Setiap brand marketplace memiliki tautan toko untuk negara yang tersedia." onAdd={() => setModal({ kind: "marketplace" })} addLabel="Tambah Marketplace" />
        <div className={styles.marketList}>
          {marketplaces.map((marketplace, index) => {
            const isOpen = openMarkets.includes(marketplace.id);
            return <article key={marketplace.id} className={`${styles.marketCard} ${dragging?.kind === "marketplace" && dragging.id === marketplace.id ? styles.dragging : ""}`} draggable onDragStart={() => setDragging({ kind: "marketplace", id: marketplace.id })} onDragOver={(event) => event.preventDefault()} onDrop={() => dropOn("marketplace", marketplace.id)}>
              <div className={styles.marketHeader}>
                <span className={styles.handle} title="Tarik untuk mengurutkan">⠿</span>
                <button type="button" className={styles.marketIdentity} onClick={() => setOpenMarkets((ids) => isOpen ? ids.filter((id) => id !== marketplace.id) : [...ids, marketplace.id])}><span className={styles.logoBox}>{marketplace.logoUrl ? <Image src={marketplace.logoUrl} alt="" width={38} height={38} unoptimized /> : marketplace.name.slice(0, 1)}</span><span><strong>{marketplace.displayName}</strong><small>{marketplace.promos.length} link negara</small></span></button>
                <ReorderButtons index={index} total={marketplaces.length} onStep={(direction) => step("marketplace", marketplace.id, direction)} />
                <Toggle checked={marketplace.isActive} label={`Aktifkan ${marketplace.name}`} onChange={(value) => toggle("marketplace", marketplace.id, value)} />
                <button type="button" className={styles.smallButton} onClick={() => setModal({ kind: "marketplace", item: marketplace })}>Edit</button>
                <button type="button" className={styles.chevron} aria-expanded={isOpen} onClick={() => setOpenMarkets((ids) => isOpen ? ids.filter((id) => id !== marketplace.id) : [...ids, marketplace.id])}>{isOpen ? "−" : "+"}</button>
              </div>
              {isOpen && <div className={styles.promoArea}>
                <div className={styles.promoToolbar}><strong>Daftar marketplace negara</strong><button type="button" onClick={() => setModal({ kind: "promo", marketplaceId: marketplace.id })}>+ Tambah Negara</button></div>
                <div className={styles.cardList}>
                  {marketplace.promos.map((promo, promoIndex) => <ContentCard compact key={promo.id} kind="promo" id={promo.id} index={promoIndex} total={marketplace.promos.length} title={promo.title} subtitle={promo.destinationUrl} isActive={promo.isActive} dragging={dragging?.kind === "promo" && dragging.id === promo.id} onDragStart={() => setDragging({ kind: "promo", id: promo.id, scope: marketplace.id })} onDrop={() => dropOn("promo", promo.id, marketplace.id)} onStep={(direction) => step("promo", promo.id, direction, marketplace.id)} onToggle={(value) => toggle("promo", promo.id, value, marketplace.id)} onEdit={() => setModal({ kind: "promo", marketplaceId: marketplace.id, item: promo })} onDelete={() => setDeleteTarget({ kind: "promo", id: promo.id, title: promo.title, scope: marketplace.id })} />)}
                  {!marketplace.promos.length && <EmptyState text="Belum ada link negara pada marketplace ini." />}
                </div>
                <button type="button" className={styles.deleteMarket} onClick={() => setDeleteTarget({ kind: "marketplace", id: marketplace.id, title: marketplace.displayName })}>Hapus marketplace</button>
              </div>}
            </article>;
          })}
        </div>
      </section>

      <section className={styles.cmsSection}>
        <SectionTitle eyebrow="Navigasi" title="Menu sidebar" description="Link tambahan yang tampil di menu portal." onAdd={() => setModal({ kind: "navigation" })} addLabel="Tambah Menu" />
        <div className={styles.cardList}>
          {navigation.map((item, index) => <ContentCard compact key={item.id} kind="navigation" id={item.id} index={index} total={navigation.length} title={item.label} subtitle={item.destinationUrl} isActive={item.isActive} dragging={dragging?.kind === "navigation" && dragging.id === item.id} onDragStart={() => setDragging({ kind: "navigation", id: item.id })} onDrop={() => dropOn("navigation", item.id)} onStep={(direction) => step("navigation", item.id, direction)} onToggle={(value) => toggle("navigation", item.id, value)} onEdit={() => setModal({ kind: "navigation", item })} onDelete={() => setDeleteTarget({ kind: "navigation", id: item.id, title: item.label })} />)}
        </div>
      </section>

      <section className={styles.cmsSection}>
        <SectionTitle eyebrow="Preferensi" title="Pengaturan portal" description="Pengaturan umum carousel, pencarian, link, dan footer." />
        <form className={styles.settingsForm} action={(formData) => startTransition(async () => finish(await saveSettingsAction(formData)))}>
          <div className={styles.formGrid}>
            <Field label="Nama situs"><input name="siteName" defaultValue={content.settings.siteName} required /></Field>
            <Field label="Interval carousel (detik)"><input name="carouselIntervalSeconds" type="number" min="3" max="15" defaultValue={content.settings.carouselIntervalSeconds} required /></Field>
            <Field label="Cakupan pencarian"><select name="searchScope" defaultValue={content.settings.searchScope}><option value="marketplaces_and_promos">Marketplace & negara</option><option value="marketplaces_only">Brand marketplace saja</option></select></Field>
            <Field label="Link dibuka pada"><select name="linkTarget" defaultValue={content.settings.linkTarget}><option value="new_tab">Tab baru</option><option value="same_tab">Tab yang sama</option></select></Field>
            <Field label="Judul footer"><input name="footerTitle" defaultValue={content.settings.footerTitle} required /></Field>
            <Field label="Deskripsi footer"><textarea name="footerDescription" defaultValue={content.settings.footerDescription ?? ""} rows={3} /></Field>
            <Field label="Teks copyright"><input name="copyrightText" defaultValue={content.settings.copyrightText} required /></Field>
            <Field label="Label Terms"><input name="termsLabel" defaultValue={content.settings.termsLabel} required /></Field>
            <Field label="Link Terms (opsional)"><input name="termsUrl" type="url" defaultValue={content.settings.termsUrl ?? ""} placeholder="https://..." /></Field>
          </div>
          <label className={styles.checkField}><input type="checkbox" name="hideEmptyMarketplaces" defaultChecked={content.settings.hideEmptyMarketplaces} />Sembunyikan marketplace yang tidak memiliki link negara aktif</label>
          <button className={styles.primaryButton} disabled={pending}>Simpan Pengaturan</button>
        </form>
      </section>

      {modal && <EditorDialog modal={modal} marketplaces={marketplaces} pending={pending} onClose={() => setModal(null)} onSubmit={submitEditor} />}
      {deleteTarget && <ConfirmationDialog target={deleteTarget} pending={pending} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />}
    </div>
  );
}

function SectionTitle({ eyebrow, title, description, onAdd, addLabel }: { eyebrow: string; title: string; description: string; onAdd?: () => void; addLabel?: string }) {
  return <div className={styles.sectionTitle}><div><span className="uiContextLabel">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{onAdd && <button type="button" onClick={onAdd}>+ {addLabel}</button>}</div>;
}

function ReorderButtons({ index, total, onStep }: { index: number; total: number; onStep: (direction: -1 | 1) => void }) {
  return <div className={styles.orderButtons}><button type="button" disabled={index === 0} aria-label="Naikkan urutan" onClick={() => onStep(-1)}>↑</button><button type="button" disabled={index === total - 1} aria-label="Turunkan urutan" onClick={() => onStep(1)}>↓</button></div>;
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <label className={styles.toggle} title={label}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span /><em>{checked ? "Aktif" : "Nonaktif"}</em></label>;
}

function ContentCard({ index, total, title, subtitle, imageUrl, isActive, dragging, compact, onDragStart, onDrop, onStep, onToggle, onEdit, onDelete }: { kind: ReorderKind; id: number; index: number; total: number; title: string; subtitle: string; imageUrl?: string | null; isActive: boolean; dragging: boolean; compact?: boolean; onDragStart: () => void; onDrop: () => void; onStep: (direction: -1 | 1) => void; onToggle: (checked: boolean) => void; onEdit: () => void; onDelete: () => void }) {
  return <article className={`${styles.contentCard} ${compact ? styles.compactCard : ""} ${dragging ? styles.dragging : ""}`} draggable onDragStart={(event) => { event.stopPropagation(); onDragStart(); }} onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); }} onDrop={(event) => { event.stopPropagation(); onDrop(); }}>
    <span className={styles.handle} title="Tarik untuk mengurutkan">⠿</span>
    {imageUrl !== undefined && <span className={styles.thumbnail}>{imageUrl ? <Image src={imageUrl} alt="" width={86} height={56} unoptimized /> : <span>IMG</span>}</span>}
    <span className={styles.cardCopy}><strong>{title}</strong><small>{subtitle}</small></span>
    <ReorderButtons index={index} total={total} onStep={onStep} />
    <Toggle checked={isActive} label={`Aktifkan ${title}`} onChange={onToggle} />
    <button type="button" className={styles.smallButton} onClick={onEdit}>Edit</button>
    <button type="button" className={styles.deleteButton} aria-label={`Hapus ${title}`} onClick={onDelete}>×</button>
  </article>;
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={wide ? styles.wideField : ""}><span>{label}</span>{children}</label>;
}

function EmptyState({ text }: { text: string }) {
  return <div className={styles.emptyState}>{text}</div>;
}

function CurrentAsset({ src, label }: { src: string | null; label: string }) {
  return <div className={styles.currentAsset}>
    <span className={styles.currentAssetPreview}>{src ? <Image src={src} alt="" width={112} height={72} unoptimized /> : "Belum ada"}</span>
    <span><strong>{label}</strong><small>{src ? "File ini tetap digunakan jika Anda tidak memilih file baru." : "Belum ada file yang tersimpan."}</small></span>
  </div>;
}

function ConfirmationDialog({ target, pending, onCancel, onConfirm }: { target: DeleteTarget; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  const kindLabel = target.kind === "hero" ? "hero" : target.kind === "marketplace" ? "marketplace" : target.kind === "promo" ? "marketplace negara" : "menu";
  return <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => { if (!pending && event.target === event.currentTarget) onCancel(); }}>
    <div className={`${styles.dialog} ${styles.confirmDialog}`} role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
      <div className={styles.dialogHeader}><h2 id="delete-dialog-title">Hapus {kindLabel}?</h2><button type="button" onClick={onCancel} disabled={pending} aria-label="Tutup">×</button></div>
      <div className={styles.confirmBody}>
        <p id="delete-dialog-description"><strong>{target.title}</strong> akan dihapus permanen.{target.kind === "marketplace" ? " Semua link negara di dalam marketplace ini juga akan terhapus." : ""}</p>
        <div className={styles.dialogActions}><button type="button" onClick={onCancel} disabled={pending}>Batal</button><button type="button" className={styles.dangerButton} onClick={onConfirm} disabled={pending}>{pending ? "Menghapus..." : "Ya, hapus"}</button></div>
      </div>
    </div>
  </div>;
}

function EditorDialog({ modal, marketplaces, pending, onClose, onSubmit }: { modal: EditorModal; marketplaces: Marketplace[]; pending: boolean; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const title = `${modal.item ? "Edit" : "Tambah"} ${modal.kind === "hero" ? "Hero" : modal.kind === "marketplace" ? "Marketplace" : modal.kind === "promo" ? "Marketplace Negara" : "Menu"}`;
  return <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="editor-dialog-title">
      <div className={styles.dialogHeader}><div><span className="uiContextLabel">Edit konten</span><h2 id="editor-dialog-title">{title}</h2></div><button type="button" onClick={onClose} aria-label="Tutup">×</button></div>
      <form onSubmit={onSubmit}>
        {modal.item && <input type="hidden" name="id" value={modal.item.id} />}
        {modal.kind === "hero" && <>
          <Field label="Judul hero"><input name="title" defaultValue={modal.item?.title ?? ""} required /></Field>
          <Field label="Deskripsi"><textarea name="description" defaultValue={modal.item?.description ?? ""} rows={3} /></Field>
          {modal.item && <CurrentAsset src={modal.item.imageUrl} label="Gambar hero saat ini" />}
          <Field label={modal.item ? "Ganti gambar (opsional)" : "Gambar hero"}><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" required={!modal.item} /><small className={styles.uploadHint}>{modal.item ? "Biarkan kosong untuk tetap memakai gambar saat ini. " : ""}<strong>Ukuran standar 1080 × 1080 px (rasio 1:1).</strong> Maksimal 3 MB. JPG, PNG, WEBP, atau SVG.</small></Field>
          <Field label="Teks alternatif gambar"><input name="altText" defaultValue={modal.item?.altText ?? ""} required /></Field>
          <Field label="Link tujuan (opsional)"><input name="destinationUrl" type="url" defaultValue={modal.item?.destinationUrl ?? ""} placeholder="https://..." /></Field>
        </>}
        {modal.kind === "marketplace" && <>
          <Field label="Nama singkat"><input name="name" defaultValue={modal.item?.name ?? ""} placeholder="Shopee" required /></Field>
          <Field label="Nama tampilan"><input name="displayName" defaultValue={modal.item?.displayName ?? ""} placeholder="Shopee" required /></Field>
          {modal.item && <CurrentAsset src={modal.item.logoUrl} label="Logo marketplace saat ini" />}
          <Field label={modal.item ? "Ganti logo (opsional)" : "Logo (opsional)"}><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" /><small className={styles.uploadHint}>{modal.item ? "Biarkan kosong untuk tetap memakai logo saat ini. " : ""}<strong>Ukuran standar 512 × 512 px (rasio 1:1).</strong> Maksimal 3 MB; latar transparan disarankan.</small></Field>
        </>}
        {modal.kind === "promo" && <>
          <input type="hidden" name="marketplaceId" value={modal.marketplaceId} />
          <Field label="Marketplace"><select value={modal.marketplaceId} disabled>{marketplaces.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></Field>
          <Field label="Negara"><input name="title" defaultValue={countryFieldValue(marketplaces.find((item) => item.id === modal.marketplaceId), modal.item?.title ?? "")} placeholder="Contoh: Indonesia" required /></Field>
          <Field label="Link marketplace"><input name="destinationUrl" type="url" defaultValue={modal.item?.destinationUrl ?? ""} placeholder="https://..." required /></Field>
        </>}
        {modal.kind === "navigation" && <>
          <Field label="Label menu"><input name="label" defaultValue={modal.item?.label ?? ""} required /></Field>
          <Field label="Link tujuan"><input name="destinationUrl" defaultValue={modal.item?.destinationUrl ?? ""} placeholder="#section, /halaman, atau https://..." required /></Field>
        </>}
        <div className={styles.dialogActions}><button type="button" onClick={onClose}>Batal</button><button className={styles.primaryButton} disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</button></div>
      </form>
    </div>
  </div>;
}
