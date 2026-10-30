-- Country/region is not part of the marketplace content model.
alter table public.marketplaces
  drop column if exists country;
