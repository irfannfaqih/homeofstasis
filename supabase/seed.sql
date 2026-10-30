-- Development content only. Production content is managed from the CMS.

insert into public.hero_slides
  (title, description, image_path, alt_text, destination_url, sort_order, is_active)
values
  ('Introducing Home of Stasis', 'Temukan marketplace resmi Stasis di berbagai negara dalam satu portal.', '/hero/team-red.jpg', 'Tim Home of Stasis dengan latar merah', null, 0, true),
  ('Informasi atau Campaign', 'Slide informasi dapat ditampilkan tanpa destination link.', '/hero/team-gray.jpg', 'Tim Home of Stasis dengan latar abu-abu', null, 1, true),
  ('Featured Collection', 'Setiap slide dapat diarahkan ke halaman yang berbeda.', '/hero/team-coral.jpg', 'Tim Home of Stasis dengan latar coral', 'https://example.com/new-arrival', 2, true);

insert into public.marketplaces
  (name, display_name, sort_order, is_active)
values
  ('Shopee', 'Shopee', 0, true),
  ('TikTok', 'TikTok Shop', 1, true),
  ('Tokopedia', 'Tokopedia', 2, true);

insert into public.promos
  (marketplace_id, title, destination_url, sort_order, is_active)
select id, 'Indonesia', 'https://example.com/shopee/indonesia', 0, true
from public.marketplaces where name = 'Shopee'
union all
select id, 'Malaysia', 'https://example.com/shopee/malaysia', 1, true
from public.marketplaces where name = 'Shopee'
union all
select id, 'Philippines', 'https://example.com/shopee/philippines', 2, true
from public.marketplaces where name = 'Shopee'
union all
select id, 'Indonesia', 'https://example.com/tiktok/indonesia', 0, true
from public.marketplaces where name = 'TikTok'
union all
select id, 'Malaysia', 'https://example.com/tiktok/malaysia', 1, true
from public.marketplaces where name = 'TikTok'
union all
select id, 'Indonesia', 'https://example.com/tokopedia/indonesia', 0, true
from public.marketplaces where name = 'Tokopedia';

insert into public.navigation_links (label, destination_url, sort_order, is_active)
values
  ('Tentang Stasis', '#about', 0, true),
  ('Hubungi Kami', '#contact', 1, true);
