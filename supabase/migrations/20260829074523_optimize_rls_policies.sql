-- Evaluate the JWT once per statement and avoid overlapping SELECT policies.
-- Public content is fetched with the anonymous client; authenticated access is
-- reserved for CMS administrators.

alter policy hero_slides_public_read
on public.hero_slides
to anon;

alter policy marketplaces_public_read
on public.marketplaces
to anon;

alter policy promos_public_read
on public.promos
to anon;

alter policy navigation_links_public_read
on public.navigation_links
to anon;

alter policy site_settings_public_read
on public.site_settings
to anon;

alter policy hero_slides_admin_all
on public.hero_slides
using (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin')
with check (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin');

alter policy marketplaces_admin_all
on public.marketplaces
using (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin')
with check (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin');

alter policy promos_admin_all
on public.promos
using (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin')
with check (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin');

alter policy navigation_links_admin_all
on public.navigation_links
using (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin')
with check (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin');

alter policy site_settings_admin_all
on public.site_settings
using (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin')
with check (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin');

alter policy portal_assets_admin_select
on storage.objects
using (
  bucket_id = 'portal-assets'
  and coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);

alter policy portal_assets_admin_insert
on storage.objects
with check (
  bucket_id = 'portal-assets'
  and coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);

alter policy portal_assets_admin_update
on storage.objects
using (
  bucket_id = 'portal-assets'
  and coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
)
with check (
  bucket_id = 'portal-assets'
  and coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);

alter policy portal_assets_admin_delete
on storage.objects
using (
  bucket_id = 'portal-assets'
  and coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);
