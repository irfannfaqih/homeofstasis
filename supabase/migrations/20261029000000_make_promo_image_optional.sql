-- Promos are rendered as link buttons, so an image is no longer required.
alter table public.promos
  alter column image_path drop not null;
