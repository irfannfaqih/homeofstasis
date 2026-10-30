-- Keep the Storage bucket restriction aligned with the CMS upload limit.
update storage.buckets
set file_size_limit = 3 * 1024 * 1024
where id = 'portal-assets';
