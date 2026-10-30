-- Stasis Marketplace Promo Portal
-- Initial schema for public content, admin CMS, and image storage.

create table public.hero_slides (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  image_path text not null,
  alt_text text not null default '',
  destination_url text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hero_slides_destination_url_check
    check (destination_url is null or destination_url ~* '^https?://[^[:space:]]+$'),
  constraint hero_slides_schedule_check
    check (end_at is null or start_at is null or end_at >= start_at)
);

create table public.marketplaces (
  id bigint generated always as identity primary key,
  name text not null,
  country text not null,
  display_name text not null,
  logo_path text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.promos (
  id bigint generated always as identity primary key,
  marketplace_id bigint not null references public.marketplaces(id) on delete cascade,
  title text not null,
  image_path text not null,
  alt_text text not null default '',
  destination_url text not null,
  start_date date not null,
  end_date date not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promos_destination_url_check
    check (destination_url ~* '^https?://[^[:space:]]+$'),
  constraint promos_schedule_check
    check (end_date >= start_date)
);

create table public.navigation_links (
  id bigint generated always as identity primary key,
  label text not null,
  destination_url text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint navigation_links_destination_url_check
    check (destination_url ~* '^(https?://|/|#)')
);

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  site_name text not null default 'Home of Stasis',
  header_logo_path text,
  carousel_interval_seconds integer not null default 5
    check (carousel_interval_seconds between 3 and 15),
  search_scope text not null default 'marketplaces_and_promos'
    check (search_scope in ('marketplaces_and_promos', 'marketplaces_only')),
  link_target text not null default 'new_tab'
    check (link_target in ('new_tab', 'same_tab')),
  hide_empty_marketplaces boolean not null default true,
  footer_title text not null default 'Home of Stasis',
  footer_description text,
  footer_logo_path text,
  copyright_text text not null default '© 2026 Home of Stasis',
  terms_label text not null default 'Terms & Policies',
  terms_url text,
  updated_at timestamptz not null default now(),
  constraint site_settings_terms_url_check
    check (terms_url is null or terms_url ~* '^https?://[^[:space:]]+$')
);

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

-- Indexes match the public rendering queries and drag-and-drop ordering.
create index hero_slides_active_order_idx
  on public.hero_slides (sort_order)
  where is_active = true;

create index marketplaces_active_order_idx
  on public.marketplaces (sort_order)
  where is_active = true;

create index promos_marketplace_active_order_idx
  on public.promos (marketplace_id, sort_order)
  where is_active = true;

create index navigation_links_active_order_idx
  on public.navigation_links (sort_order)
  where is_active = true;

-- Keep updated_at consistent without relying on every client mutation.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger hero_slides_set_updated_at
before update on public.hero_slides
for each row execute function public.set_updated_at();

create trigger marketplaces_set_updated_at
before update on public.marketplaces
for each row execute function public.set_updated_at();

create trigger promos_set_updated_at
before update on public.promos
for each row execute function public.set_updated_at();

create trigger navigation_links_set_updated_at
before update on public.navigation_links
for each row execute function public.set_updated_at();

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

-- All Data API tables use RLS. Public policies reveal only publishable content.
alter table public.hero_slides enable row level security;
alter table public.marketplaces enable row level security;
alter table public.promos enable row level security;
alter table public.navigation_links enable row level security;
alter table public.site_settings enable row level security;

create policy hero_slides_public_read
on public.hero_slides
for select
to anon, authenticated
using (
  is_active = true
  and (start_at is null or start_at <= now())
  and (end_at is null or end_at >= now())
);

create policy marketplaces_public_read
on public.marketplaces
for select
to anon, authenticated
using (is_active = true);

create policy promos_public_read
on public.promos
for select
to anon, authenticated
using (
  is_active = true
  and start_date <= current_date
  and end_date >= current_date
  and exists (
    select 1
    from public.marketplaces
    where marketplaces.id = promos.marketplace_id
      and marketplaces.is_active = true
  )
);

create policy navigation_links_public_read
on public.navigation_links
for select
to anon, authenticated
using (is_active = true);

create policy site_settings_public_read
on public.site_settings
for select
to anon, authenticated
using (true);

-- Admin authorization comes from immutable app_metadata, never user_metadata.
create policy hero_slides_admin_all
on public.hero_slides
for all
to authenticated
using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin')
with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

create policy marketplaces_admin_all
on public.marketplaces
for all
to authenticated
using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin')
with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

create policy promos_admin_all
on public.promos
for all
to authenticated
using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin')
with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

create policy navigation_links_admin_all
on public.navigation_links
for all
to authenticated
using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin')
with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

create policy site_settings_admin_all
on public.site_settings
for all
to authenticated
using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin')
with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

-- Explicit Data API privileges; RLS remains the row-level enforcement layer.
revoke all on public.hero_slides from public;
revoke all on public.marketplaces from public;
revoke all on public.promos from public;
revoke all on public.navigation_links from public;
revoke all on public.site_settings from public;

grant usage on schema public to anon, authenticated;
grant select on public.hero_slides, public.marketplaces, public.promos,
  public.navigation_links, public.site_settings to anon;
grant select, insert, update, delete on public.hero_slides, public.marketplaces,
  public.promos, public.navigation_links, public.site_settings to authenticated;

grant usage, select on sequence public.hero_slides_id_seq to authenticated;
grant usage, select on sequence public.marketplaces_id_seq to authenticated;
grant usage, select on sequence public.promos_id_seq to authenticated;
grant usage, select on sequence public.navigation_links_id_seq to authenticated;

-- Public bucket: images can be viewed by visitors; only admins may manage files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portal-assets',
  'portal-assets',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy portal_assets_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'portal-assets'
  and coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
);

create policy portal_assets_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'portal-assets'
  and coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
);

create policy portal_assets_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'portal-assets'
  and coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
)
with check (
  bucket_id = 'portal-assets'
  and coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
);

create policy portal_assets_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'portal-assets'
  and coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
);
