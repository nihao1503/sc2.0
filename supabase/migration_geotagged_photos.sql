-- ============================================================
-- Migration: geotagged photo proof on every status update
-- Run this in the Supabase SQL editor on your EXISTING project.
-- ============================================================

-- 1. Store the photo + where/when it was taken alongside each site's status.
alter table site_status add column if not exists photo_path text;
alter table site_status add column if not exists photo_lat double precision;
alter table site_status add column if not exists photo_lng double precision;
alter table site_status add column if not exists photo_accuracy_m double precision;
alter table site_status add column if not exists photo_taken_at timestamptz;

-- 2. Create a private storage bucket for the photos.
--    If this insert fails due to permissions, create it manually instead:
--    Supabase dashboard → Storage → New bucket → name it exactly "site-photos" →
--    leave "Public bucket" UNCHECKED → Create.
insert into storage.buckets (id, name, public)
values ('site-photos', 'site-photos', false)
on conflict (id) do nothing;

-- 3. Access rules for the bucket — same zone-based scoping as everything else.
--    Photos are stored as "<site_id>/<filename>", so we pull the site_id out
--    of the file path and check it against the uploader's assigned zones.
create policy "read site photos in scope" on storage.objects
  for select using (
    bucket_id = 'site-photos' and (
      is_admin() or exists (
        select 1 from sites
        where sites.id = (storage.foldername(name))[1]
          and sites.package = my_package()
          and sites.zone = any(my_zones())
      )
    )
  );

create policy "upload site photos in scope" on storage.objects
  for insert with check (
    bucket_id = 'site-photos' and (
      is_admin() or exists (
        select 1 from sites
        where sites.id = (storage.foldername(name))[1]
          and sites.package = my_package()
          and sites.zone = any(my_zones())
      )
    )
  );
