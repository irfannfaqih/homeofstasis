-- Promo scheduling is optional. A missing bound means the promo has no limit
-- on that side of the schedule.
alter table public.promos
  alter column start_date drop not null,
  alter column end_date drop not null;

alter policy promos_public_read
on public.promos
using (
  is_active = true
  and (start_date is null or start_date <= current_date)
  and (end_date is null or end_date >= current_date)
  and exists (
    select 1
    from public.marketplaces
    where marketplaces.id = promos.marketplace_id
      and marketplaces.is_active = true
  )
);
