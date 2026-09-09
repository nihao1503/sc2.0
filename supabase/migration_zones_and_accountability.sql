-- ============================================================
-- Migration: zone-level supervisor assignment + accountability
-- Run this in the Supabase SQL editor on your EXISTING project.
-- Safe to run once; it won't touch your sites or site_status data.
-- ============================================================

-- 1. Supervisors now own a specific list of zones within their package,
--    instead of the whole package. e.g. zones = ARRAY['1','2'] means
--    they're responsible for Zone 1 and Zone 2 only.
alter table profiles add column if not exists zones text[];

-- Admins keep zones = null (they see everything regardless).

-- 2. Replace the package-only scoping function with a zone-aware one.
create or replace function my_zones() returns text[] as $$
  select zones from profiles where id = auth.uid();
$$ language sql stable security definer;

-- 3. Drop the old policies that only checked package, and recreate them
--    checking package AND zone membership.
drop policy if exists "read sites in scope" on sites;
create policy "read sites in scope" on sites
  for select using (
    is_admin() or (package = my_package() and zone = any(my_zones()))
  );

drop policy if exists "read status in scope" on site_status;
create policy "read status in scope" on site_status
  for select using (
    is_admin() or exists (
      select 1 from sites
      where sites.id = site_status.site_id
        and sites.package = my_package()
        and sites.zone = any(my_zones())
    )
  );

drop policy if exists "write status in scope" on site_status;
create policy "write status in scope" on site_status
  for insert with check (
    is_admin() or exists (
      select 1 from sites
      where sites.id = site_status.site_id
        and sites.package = my_package()
        and sites.zone = any(my_zones())
    )
  );

drop policy if exists "update status in scope" on site_status;
create policy "update status in scope" on site_status
  for update using (
    is_admin() or exists (
      select 1 from sites
      where sites.id = site_status.site_id
        and sites.package = my_package()
        and sites.zone = any(my_zones())
    )
  );

-- 4. Admins need to see every supervisor's profile to build the
--    accountability view (who's assigned where, who's gone quiet).
--    Supervisors still only ever see their own profile.
create policy "admin read all profiles" on profiles
  for select using (is_admin());

-- ============================================================
-- 5. Assign zones to your existing supervisors.
--    Replace the UUIDs with the real User UIDs from Authentication > Users,
--    and adjust the zone lists to match who covers what right now.
--    Package 2 zones are '1','2','3','4'. Package 4 zones are '11'..'15'.
-- ============================================================

-- Example — edit these to match your real 3 P2 supervisors and 2 P4 supervisors:
-- update profiles set zones = array['1','2'] where id = 'uuid-of-p2-supervisor-1';
-- update profiles set zones = array['3']     where id = 'uuid-of-p2-supervisor-2';
-- update profiles set zones = array['4']     where id = 'uuid-of-p2-supervisor-3';
-- update profiles set zones = array['11','12','13'] where id = 'uuid-of-p4-supervisor-1';
-- update profiles set zones = array['14','15']      where id = 'uuid-of-p4-supervisor-2';
