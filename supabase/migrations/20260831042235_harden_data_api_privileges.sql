-- Restrict Data API access to the exact operations used by the portal.
-- RLS remains the row-level authorization layer, while these grants reduce
-- the reachable surface for anonymous and authenticated clients.

revoke all privileges on table
  public.hero_slides,
  public.marketplaces,
  public.promos,
  public.navigation_links,
  public.site_settings
from anon, authenticated;

grant select on table
  public.hero_slides,
  public.marketplaces,
  public.promos,
  public.navigation_links,
  public.site_settings
to anon;

grant select, insert, update, delete on table
  public.hero_slides,
  public.marketplaces,
  public.promos,
  public.navigation_links,
  public.site_settings
to authenticated;

revoke all privileges on sequence
  public.hero_slides_id_seq,
  public.marketplaces_id_seq,
  public.promos_id_seq,
  public.navigation_links_id_seq
from anon, authenticated;

grant usage, select on sequence
  public.hero_slides_id_seq,
  public.marketplaces_id_seq,
  public.promos_id_seq,
  public.navigation_links_id_seq
to authenticated;

-- New public-schema objects must be exposed deliberately in their own
-- migrations instead of inheriting broad Data API access.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;
