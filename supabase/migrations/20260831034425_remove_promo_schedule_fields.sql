-- Promo visibility is controlled only by its active status and parent
-- marketplace. Scheduling fields are no longer part of the product.
alter policy promos_public_read
on public.promos
using (
  is_active = true
  and exists (
    select 1
    from public.marketplaces
    where marketplaces.id = promos.marketplace_id
      and marketplaces.is_active = true
  )
);

alter table public.promos
  drop constraint if exists promos_schedule_check,
  drop column if exists start_date,
  drop column if exists end_date;
