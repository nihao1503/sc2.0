-- ============================================================
-- Site Register schema for Sumeet Creator Infrastructure
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)
-- ============================================================

-- 1. Profiles table: one row per logged-in person, linking to Supabase's
--    built-in auth.users table. This is where each person's role and
--    package assignment lives.
create table if not exists profiles (
  id uuid references auth.users(id) primary key,
  name text not null,
  role text not null check (role in ('supervisor', 'admin')),
  package text check (package in ('P2', 'P4')), -- null for admin (sees both)
  zones text[], -- which zones within that package this supervisor owns, e.g. ARRAY['1','2']. Null for admin.
  created_at timestamptz default now()
);

-- 2. Sites: the master list of toilet locations (seeded from the MIOP data)
create table if not exists sites (
  id text primary key,
  package text not null check (package in ('P2', 'P4')),
  zone text not null,
  zone_name text not null,
  ward text,
  name text not null,
  type text,
  category text,
  lat double precision,
  lng double precision,
  in_current_scope boolean not null default false,
  created_at timestamptz default now()
);

-- 3. Site status: the live, editable status per site
create table if not exists site_status (
  site_id text references sites(id) primary key,
  status text not null default 'unknown' check (status in ('active','halted','notstarted','completed','unknown')),
  reason text,
  note text,
  updated_by text,
  updated_at timestamptz default now(),
  -- Geotagged photo proof: required on every update so a status change can't
  -- be logged without visiting the site and taking a fresh photo there.
  photo_path text,
  photo_lat double precision,
  photo_lng double precision,
  photo_accuracy_m double precision,
  photo_taken_at timestamptz
);

-- ============================================================
-- Row Level Security — this is the actual access control.
-- It's enforced by the database itself, not by the app's UI,
-- so it holds even if someone bypasses the frontend entirely.
-- ============================================================

alter table profiles enable row level security;
alter table sites enable row level security;
alter table site_status enable row level security;

-- Everyone can read their own profile (needed so the app knows their role)
create policy "read own profile" on profiles
  for select using (auth.uid() = id);

-- Helper: is the current user an admin?
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

-- Helper: which package can the current user see? (null means "all", for admins)
create or replace function my_package() returns text as $$
  select package from profiles where id = auth.uid();
$$ language sql stable security definer;

-- Helper: which specific zones (within that package) can the current user see?
create or replace function my_zones() returns text[] as $$
  select zones from profiles where id = auth.uid();
$$ language sql stable security definer;

-- Sites: a supervisor sees only the specific zones they're assigned, within
-- their package. An admin sees everything, in every package and zone.
create policy "read sites in scope" on sites
  for select using (
    is_admin() or (package = my_package() and zone = any(my_zones()))
  );

-- Site status: same scoping, joined through the sites table.
create policy "read status in scope" on site_status
  for select using (
    is_admin() or exists (
      select 1 from sites
      where sites.id = site_status.site_id
        and sites.package = my_package()
        and sites.zone = any(my_zones())
    )
  );

-- Only supervisors/admins can write status updates, and only within their scope.
create policy "write status in scope" on site_status
  for insert with check (
    is_admin() or exists (
      select 1 from sites
      where sites.id = site_status.site_id
        and sites.package = my_package()
        and sites.zone = any(my_zones())
    )
  );

create policy "update status in scope" on site_status
  for update using (
    is_admin() or exists (
      select 1 from sites
      where sites.id = site_status.site_id
        and sites.package = my_package()
        and sites.zone = any(my_zones())
    )
  );

-- Admins need to see every supervisor's profile to build the accountability
-- view (who's assigned where, who's gone quiet). Supervisors still only ever
-- see their own profile (see "read own profile" above).
create policy "admin read all profiles" on profiles
  for select using (is_admin());

-- ============================================================
-- Photo proof storage — a private bucket holding the geotagged photo that
-- must accompany every status update. Files are stored as
-- "<site_id>/<filename>" so access can be scoped the same way as everything
-- else, by checking which zones the uploader/viewer is assigned to.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('site-photos', 'site-photos', false)
on conflict (id) do nothing;

create policy "read site photos in scope" on storage.objects
  for select using (
    bucket_id = 'site-photos' and (
      is_admin() or exists (
        select 1 from sites
        where sites.id = (storage.foldername(storage.objects.name))[1]
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
        where sites.id = (storage.foldername(storage.objects.name))[1]
          and sites.package = my_package()
          and sites.zone = any(my_zones())
      )
    )
  );

-- Admins can add/edit sites (e.g. to patch the Package 4 gaps). Supervisors cannot
-- change the master list, only report status against it.
create policy "admin manage sites" on sites
  for insert with check (is_admin());
create policy "admin update sites" on sites
  for update using (is_admin());
