# Stasis Marketplace Portal

Portal mobile-first dan CMS sederhana untuk mengelola hero carousel, marketplace per negara, menu sidebar, pencarian, serta footer. Tanpa konfigurasi Supabase, aplikasi otomatis berjalan dalam **Mode Demo** dengan data contoh.

## Menjalankan aplikasi

Persyaratan: Node.js 22 atau lebih baru.

```bash
npm install
npm run dev -- --webpack
```

- Portal publik: `http://localhost:3000`
- Login CMS: `http://localhost:3000/admin`
- CMS Mode Demo: `http://localhost:3000/admin/cms`

Pemeriksaan proyek:

```bash
npm run lint
npm run build
```

## Menghubungkan Supabase

1. Buat project baru di Supabase.
2. Salin `.env.example` menjadi `.env.local`.
3. Isi URL project dan **Publishable key** dari halaman API Keys Supabase.
4. Login dan hubungkan Supabase CLI, lalu kirim migration:

```bash
npx supabase login
npx supabase link --project-ref PROJECT_REF_ANDA
npx supabase db push
```

Migration membuat tabel, index, Row Level Security, policy admin, dan bucket publik `portal-assets`. File gambar dibatasi maksimal 3 MB dengan format JPG, PNG, WEBP, atau SVG.

## Membuat akun admin

Pendaftaran publik dimatikan. Buat user email/password dari **Supabase Dashboard → Authentication → Users**, lalu jalankan perintah berikut dari SQL Editor dengan mengganti alamat email:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"admin"}'::jsonb
where email = 'admin@contoh.com';
```

Logout lalu login kembali agar token memuat claim `app_metadata.role = admin`. CMS dan policy database sama-sama memeriksa claim tersebut.

## Struktur penting

- `app/page.tsx` — portal publik
- `app/admin/page.tsx` — login CMS
- `app/admin/cms/page.tsx` — CMS satu halaman
- `app/admin/cms/actions.ts` — CRUD, upload, toggle, dan penyimpanan urutan
- `supabase/migrations/` — schema dan policy database
- `supabase/seed.sql` — data contoh untuk database lokal

Untuk menjalankan Supabase secara lokal, Docker Desktop harus aktif, kemudian gunakan `npx supabase start` dan `npx supabase db reset`.

## Deployment ke Vercel

1. Hubungkan repository ini ke Vercel dengan framework preset **Next.js**.
2. Gunakan Node.js 22 dan perintah build `npm run build`.
3. Tambahkan environment variables berikut untuk Production, Preview, dan Development:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

4. Setelah URL production tersedia, tambahkan URL tersebut pada konfigurasi URL Supabase Auth.
5. Jalankan smoke test pada `/`, `/admin`, dan `/admin/cms` setelah deployment.

Jangan memasukkan secret key atau `service_role` key ke environment variable yang diawali `NEXT_PUBLIC_`.
