-- Replace development placeholder heroes with the bundled Home of Stasis team artwork.
-- Existing CMS uploads are intentionally left unchanged.

update public.hero_slides
set
  image_path = '/hero/team-red.jpg',
  alt_text = 'Tim Home of Stasis dengan latar merah'
where sort_order = 0
  and image_path like 'https://placehold.co/%';

update public.hero_slides
set
  image_path = '/hero/team-gray.jpg',
  alt_text = 'Tim Home of Stasis dengan latar abu-abu'
where sort_order = 1
  and image_path like 'https://placehold.co/%';

update public.hero_slides
set
  image_path = '/hero/team-coral.jpg',
  alt_text = 'Tim Home of Stasis dengan latar coral'
where sort_order = 2
  and image_path like 'https://placehold.co/%';

with bundled_heroes (title, description, image_path, alt_text, ordinal) as (
  values
    ('Introducing Home of Stasis', 'Temukan marketplace resmi Stasis di berbagai negara dalam satu portal.', '/hero/team-red.jpg', 'Tim Home of Stasis dengan latar merah', 0),
    ('Informasi atau Campaign', 'Slide informasi dapat ditampilkan tanpa destination link.', '/hero/team-gray.jpg', 'Tim Home of Stasis dengan latar abu-abu', 1),
    ('Featured Collection', 'Setiap slide dapat diarahkan ke halaman yang berbeda.', '/hero/team-coral.jpg', 'Tim Home of Stasis dengan latar coral', 2)
), missing_heroes as (
  select bundled_heroes.*
  from bundled_heroes
  where not exists (
    select 1
    from public.hero_slides
    where hero_slides.image_path = bundled_heroes.image_path
  )
), current_order as (
  select coalesce(max(sort_order), -1) as last_sort_order
  from public.hero_slides
)
insert into public.hero_slides
  (title, description, image_path, alt_text, destination_url, sort_order, is_active)
select
  missing_heroes.title,
  missing_heroes.description,
  missing_heroes.image_path,
  missing_heroes.alt_text,
  null,
  current_order.last_sort_order + (row_number() over (order by missing_heroes.ordinal))::integer,
  true
from missing_heroes
cross join current_order;
