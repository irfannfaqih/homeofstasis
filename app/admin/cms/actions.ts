"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CmsActionResult = { ok: boolean; message: string };
export type ReorderKind = "hero" | "marketplace" | "promo" | "navigation";
export type ToggleKind = ReorderKind;

const tableByKind = {
  hero: "hero_slides",
  marketplace: "marketplaces",
  promo: "promos",
  navigation: "navigation_links",
} as const;

function success(message: string): CmsActionResult {
  return { ok: true, message };
}

function failure(message: string): CmsActionResult {
  return { ok: false, message };
}

async function getAuthorizedClient() {
  const client = await createClient();
  if (!client) return null;

  const { data: { user }, error } = await client.auth.getUser();
  if (error || user?.app_metadata?.role !== "admin") {
    throw new Error("Sesi admin tidak valid. Silakan login kembali.");
  }
  return client;
}

function refreshPortal() {
  revalidatePath("/");
  revalidatePath("/admin/cms");
}

function requiredText(formData: FormData, name: string, label: string, maxLength = 160) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) throw new Error(`${label} wajib diisi.`);
  if (value.length > maxLength) throw new Error(`${label} terlalu panjang.`);
  return value;
}

function optionalText(formData: FormData, name: string, maxLength = 500) {
  const value = String(formData.get(name) ?? "").trim();
  if (value.length > maxLength) throw new Error(`Isian ${name} terlalu panjang.`);
  return value || null;
}

function positiveId(value: FormDataEntryValue | null, label = "ID") {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error(`${label} tidak valid.`);
  return id;
}

function optionalId(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw ? positiveId(raw) : null;
}

function httpUrl(value: string | null, label: string, required: boolean) {
  if (!value) {
    if (required) throw new Error(`${label} wajib diisi.`);
    return null;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
    return parsed.toString();
  } catch {
    throw new Error(`${label} harus berupa URL http atau https yang valid.`);
  }
}

function navigationUrl(value: string) {
  if (value.startsWith("#") || value.startsWith("/")) return value;
  return httpUrl(value, "Link tujuan", true) as string;
}

async function uploadImage(
  client: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  formData: FormData,
  folder: string,
) {
  const entry = formData.get("image");
  if (!(entry instanceof File) || entry.size === 0) return null;
  if (entry.size > 3 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 3 MB.");

  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };
  const extension = extensions[entry.type];
  if (!extension) throw new Error("Format gambar harus JPG, PNG, WEBP, atau SVG.");

  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from("portal-assets").upload(path, entry, {
    contentType: entry.type,
    upsert: false,
  });
  if (error) throw new Error(`Gambar gagal diunggah: ${error.message}`);
  return path;
}

async function removeAsset(
  client: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  path: string | null | undefined,
) {
  if (path && !path.startsWith("/") && !/^https?:\/\//i.test(path)) {
    await client.storage.from("portal-assets").remove([path]);
  }
}

async function lastSortOrder(
  client: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  table: "hero_slides" | "marketplaces" | "promos" | "navigation_links",
  marketplaceId?: number,
) {
  let query = client.from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1);
  if (table === "promos" && marketplaceId) query = query.eq("marketplace_id", marketplaceId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return Number(data?.[0]?.sort_order ?? -1) + 1;
}

export async function reorderAction(kind: ReorderKind, ids: number[]): Promise<CmsActionResult> {
  try {
    if (!(kind in tableByKind)) return failure("Jenis konten tidak valid.");
    if (!ids.length || ids.length > 500 || new Set(ids).size !== ids.length || ids.some((id) => !Number.isSafeInteger(id) || id < 1)) {
      return failure("Urutan konten tidak valid.");
    }
    const client = await getAuthorizedClient();
    if (!client) return success("Urutan berubah di Mode Demo. Hubungkan Supabase agar permanen.");

    const table = tableByKind[kind];
    const results = await Promise.all(ids.map((id, sortOrder) => client.from(table).update({ sort_order: sortOrder }).eq("id", id)));
    const error = results.find((result) => result.error)?.error;
    if (error) throw new Error(error.message);
    refreshPortal();
    return success("Urutan berhasil disimpan.");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Urutan gagal disimpan.");
  }
}

export async function toggleAction(kind: ToggleKind, id: number, isActive: boolean): Promise<CmsActionResult> {
  try {
    if (!(kind in tableByKind) || !Number.isSafeInteger(id) || id < 1) return failure("Konten tidak valid.");
    const client = await getAuthorizedClient();
    if (!client) return success("Status berubah di Mode Demo. Hubungkan Supabase agar permanen.");
    const { error } = await client.from(tableByKind[kind]).update({ is_active: isActive }).eq("id", id);
    if (error) throw new Error(error.message);
    refreshPortal();
    return success(isActive ? "Konten diaktifkan." : "Konten dinonaktifkan.");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Status gagal diubah.");
  }
}

export async function deleteAction(kind: ToggleKind, id: number): Promise<CmsActionResult> {
  try {
    if (!(kind in tableByKind) || !Number.isSafeInteger(id) || id < 1) return failure("Konten tidak valid.");
    const client = await getAuthorizedClient();
    if (!client) return success("Konten dihapus dari Mode Demo. Hubungkan Supabase agar permanen.");
    const table = tableByKind[kind];
    const imageColumn = kind === "hero" ? "image_path" : kind === "marketplace" ? "logo_path" : kind === "promo" ? "image_path" : null;
    const oldPaths: string[] = [];
    if (imageColumn) {
      const { data } = await client.from(table).select(imageColumn).eq("id", id).maybeSingle();
      const imageRow = data as Record<string, unknown> | null;
      if (typeof imageRow?.[imageColumn] === "string") oldPaths.push(imageRow[imageColumn]);
    }
    if (kind === "marketplace") {
      const { data: promoImages, error: promoImageError } = await client.from("promos").select("image_path").eq("marketplace_id", id);
      if (promoImageError) throw new Error(promoImageError.message);
      oldPaths.push(...(promoImages ?? []).map((row) => row.image_path).filter((path): path is string => typeof path === "string"));
    }
    const { error } = await client.from(table).delete().eq("id", id);
    if (error) throw new Error(error.message);
    await Promise.all(oldPaths.map((path) => removeAsset(client, path)));
    refreshPortal();
    return success("Konten berhasil dihapus.");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Konten gagal dihapus.");
  }
}

export async function saveHeroAction(formData: FormData): Promise<CmsActionResult> {
  let uploadedPath: string | null = null;
  try {
    const id = optionalId(formData.get("id"));
    const client = await getAuthorizedClient();
    if (!client) return success("Hero tersimpan di Mode Demo. Hubungkan Supabase agar permanen.");

    const title = requiredText(formData, "title", "Judul hero");
    const description = optionalText(formData, "description", 600);
    const altText = requiredText(formData, "altText", "Teks alternatif gambar", 180);
    const destinationUrl = httpUrl(optionalText(formData, "destinationUrl", 500), "Link tujuan", false);
    uploadedPath = await uploadImage(client, formData, "heroes");

    let oldPath: string | null = null;
    if (id) {
      const { data, error } = await client.from("hero_slides").select("image_path").eq("id", id).single();
      if (error) throw new Error(error.message);
      oldPath = data.image_path;
    } else if (!uploadedPath) {
      throw new Error("Gambar hero wajib diunggah.");
    }

    const values = {
      title,
      description,
      alt_text: altText,
      destination_url: destinationUrl,
      ...(uploadedPath ? { image_path: uploadedPath } : {}),
    };
    const result = id
      ? await client.from("hero_slides").update(values).eq("id", id)
      : await client.from("hero_slides").insert({ ...values, image_path: uploadedPath as string, sort_order: await lastSortOrder(client, "hero_slides") });
    if (result.error) throw new Error(result.error.message);
    if (uploadedPath) await removeAsset(client, oldPath);
    refreshPortal();
    return success(id ? "Hero berhasil diperbarui." : "Hero berhasil ditambahkan.");
  } catch (error) {
    if (uploadedPath) {
      const client = await createClient();
      if (client) await removeAsset(client, uploadedPath);
    }
    return failure(error instanceof Error ? error.message : "Hero gagal disimpan.");
  }
}

export async function saveMarketplaceAction(formData: FormData): Promise<CmsActionResult> {
  let uploadedPath: string | null = null;
  try {
    const id = optionalId(formData.get("id"));
    const client = await getAuthorizedClient();
    if (!client) return success("Marketplace tersimpan di Mode Demo. Hubungkan Supabase agar permanen.");
    const name = requiredText(formData, "name", "Nama marketplace", 80);
    const displayName = requiredText(formData, "displayName", "Nama tampilan", 120);
    uploadedPath = await uploadImage(client, formData, "marketplaces");

    let oldPath: string | null = null;
    if (id) {
      const { data, error } = await client.from("marketplaces").select("logo_path").eq("id", id).single();
      if (error) throw new Error(error.message);
      oldPath = data.logo_path;
    }
    const values = { name, display_name: displayName, ...(uploadedPath ? { logo_path: uploadedPath } : {}) };
    const result = id
      ? await client.from("marketplaces").update(values).eq("id", id)
      : await client.from("marketplaces").insert({ ...values, sort_order: await lastSortOrder(client, "marketplaces") });
    if (result.error) throw new Error(result.error.message);
    if (uploadedPath) await removeAsset(client, oldPath);
    refreshPortal();
    return success(id ? "Marketplace berhasil diperbarui." : "Marketplace berhasil ditambahkan.");
  } catch (error) {
    if (uploadedPath) {
      const client = await createClient();
      if (client) await removeAsset(client, uploadedPath);
    }
    return failure(error instanceof Error ? error.message : "Marketplace gagal disimpan.");
  }
}

export async function savePromoAction(formData: FormData): Promise<CmsActionResult> {
  try {
    const id = optionalId(formData.get("id"));
    const marketplaceId = positiveId(formData.get("marketplaceId"), "Marketplace");
    const client = await getAuthorizedClient();
    if (!client) return success("Marketplace negara tersimpan di Mode Demo. Hubungkan Supabase agar permanen.");
    const title = requiredText(formData, "title", "Negara");
    const destinationUrl = httpUrl(requiredText(formData, "destinationUrl", "Link marketplace", 500), "Link marketplace", true) as string;

    let oldPath: string | null = null;
    if (id) {
      const { data, error } = await client.from("promos").select("image_path").eq("id", id).single();
      if (error) throw new Error(error.message);
      oldPath = data.image_path;
    }

    const values = {
      marketplace_id: marketplaceId,
      title,
      image_path: null,
      alt_text: "",
      destination_url: destinationUrl,
    };
    const result = id
      ? await client.from("promos").update(values).eq("id", id)
      : await client.from("promos").insert({ ...values, sort_order: await lastSortOrder(client, "promos", marketplaceId) });
    if (result.error) throw new Error(result.error.message);
    await removeAsset(client, oldPath);
    refreshPortal();
    return success(id ? "Marketplace negara berhasil diperbarui." : "Marketplace negara berhasil ditambahkan.");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Marketplace negara gagal disimpan.");
  }
}

export async function saveNavigationAction(formData: FormData): Promise<CmsActionResult> {
  try {
    const id = optionalId(formData.get("id"));
    const client = await getAuthorizedClient();
    if (!client) return success("Menu tersimpan di Mode Demo. Hubungkan Supabase agar permanen.");
    const label = requiredText(formData, "label", "Label menu", 80);
    const destinationUrl = navigationUrl(requiredText(formData, "destinationUrl", "Link tujuan", 500));
    const result = id
      ? await client.from("navigation_links").update({ label, destination_url: destinationUrl }).eq("id", id)
      : await client.from("navigation_links").insert({ label, destination_url: destinationUrl, sort_order: await lastSortOrder(client, "navigation_links") });
    if (result.error) throw new Error(result.error.message);
    refreshPortal();
    return success(id ? "Menu berhasil diperbarui." : "Menu berhasil ditambahkan.");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Menu gagal disimpan.");
  }
}

export async function saveSettingsAction(formData: FormData): Promise<CmsActionResult> {
  try {
    const client = await getAuthorizedClient();
    if (!client) return success("Pengaturan tersimpan di Mode Demo. Hubungkan Supabase agar permanen.");
    const carouselIntervalSeconds = Number(formData.get("carouselIntervalSeconds"));
    if (!Number.isInteger(carouselIntervalSeconds) || carouselIntervalSeconds < 3 || carouselIntervalSeconds > 15) {
      throw new Error("Interval carousel harus antara 3–15 detik.");
    }
    const searchScope = formData.get("searchScope") === "marketplaces_only" ? "marketplaces_only" : "marketplaces_and_promos";
    const linkTarget = formData.get("linkTarget") === "same_tab" ? "same_tab" : "new_tab";
    const values = {
      site_name: requiredText(formData, "siteName", "Nama situs", 120),
      carousel_interval_seconds: carouselIntervalSeconds,
      search_scope: searchScope,
      link_target: linkTarget,
      hide_empty_marketplaces: formData.get("hideEmptyMarketplaces") === "on",
      footer_title: requiredText(formData, "footerTitle", "Judul footer", 120),
      footer_description: optionalText(formData, "footerDescription", 600),
      copyright_text: requiredText(formData, "copyrightText", "Teks copyright", 180),
      terms_label: requiredText(formData, "termsLabel", "Label Terms", 80),
      terms_url: httpUrl(optionalText(formData, "termsUrl", 500), "Link Terms", false),
    };
    const { error } = await client.from("site_settings").update(values).eq("id", 1);
    if (error) throw new Error(error.message);
    refreshPortal();
    return success("Pengaturan portal berhasil disimpan.");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Pengaturan gagal disimpan.");
  }
}
