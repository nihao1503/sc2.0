-- ============================================================
-- Migration: real coordinates for New Construction sites, and
-- distance-based photo verification.
-- Run this in the Supabase SQL editor on your EXISTING project.
-- ============================================================

-- 1. Sites can now carry a known lat/lng (only populated for sites where
--    you've supplied real coordinates — most sites will stay null, and
--    that's fine, they just won't get auto-flagged).
alter table sites add column if not exists lat double precision;
alter table sites add column if not exists lng double precision;

-- Coordinates for New Construction sites, matched/added from Neha's Google My Maps export

-- Matched to existing sites: just add lat/lng
update sites set lat = 13.0552259, lng = 80.187076 where id = 'P4-75';
update sites set lat = 13.017014, lng = 80.191866 where id = 'P4-83';
update sites set lat = 12.986502, lng = 80.170582 where id = 'P4-86';
update sites set lat = 12.991845, lng = 80.189012 where id = 'P4-94';
update sites set lat = 13.013795, lng = 80.166564 where id = 'P4-81';
update sites set lat = 12.99467, lng = 80.203376 where id = 'P4-95';
update sites set lat = 12.985614, lng = 80.176635 where id = 'P4-84';
update sites set lat = 12.984421, lng = 80.188532 where id = 'P4-98';
update sites set lat = 12.985571, lng = 80.184355 where id = 'P4-96';
update sites set lat = 13.018675, lng = 80.260287 where id = 'P4-131';
update sites set lat = 13.021873, lng = 80.252998 where id = 'P4-132';
update sites set lat = 13.022485, lng = 80.259163 where id = 'P4-133';
update sites set lat = 13.01479, lng = 80.244277 where id = 'P4-128';
update sites set lat = 12.955069, lng = 80.211426 where id = 'P4-159';
update sites set lat = 12.964569, lng = 80.193671 where id = 'P4-186';
update sites set lat = 12.930454, lng = 80.199998 where id = 'P4-168';
update sites set lat = 12.967048, lng = 80.233 where id = 'P4-183';
update sites set lat = 12.974117, lng = 80.202331 where id = 'P4-155';
update sites set lat = 12.936451, lng = 80.202018 where id = 'P4-188';
update sites set lat = 13.229632, lng = 80.325876 where id = 'P2-9';
update sites set lat = 13.202388, lng = 80.3207 where id = 'P2-40';
update sites set lat = 13.178723, lng = 80.302359 where id = 'P2-52';
update sites set lat = 13.14958, lng = 80.301062 where id = 'P2-33';
update sites set lat = 13.180505, lng = 80.302286 where id = 'P2-48';
update sites set lat = 13.224226, lng = 80.322967 where id = 'P2-16';
update sites set lat = 13.196685, lng = 80.31486 where id = 'P2-41';
update sites set lat = 13.200117, lng = 80.316152 where id = 'P2-39';
update sites set lat = 13.154065, lng = 80.274812 where id = 'P2-18';
update sites set lat = 13.179509, lng = 80.297695 where id = 'P2-53';
update sites set lat = 13.188114, lng = 80.315 where id = 'P2-59';
update sites set lat = 13.192477, lng = 80.263194 where id = 'P2-101';
update sites set lat = 13.201672, lng = 80.259882 where id = 'P2-93';
update sites set lat = 13.225366, lng = 80.274507 where id = 'P2-87';
update sites set lat = 13.181382, lng = 80.229409 where id = 'P2-111';
update sites set lat = 13.184308, lng = 80.236865 where id = 'P2-118';
update sites set lat = 13.174655, lng = 80.220202 where id = 'P2-114';
update sites set lat = 13.193482, lng = 80.238571 where id = 'P2-117';
update sites set lat = 13.194652, lng = 80.233595 where id = 'P2-107';
update sites set lat = 13.211986 , lng = 80.279 where id = 'P2-90';
update sites set lat = 13.172414, lng = 80.254204 where id = 'P2-140';
update sites set lat = 13.170706, lng = 80.263402 where id = 'P2-122';
update sites set lat = 13.166373, lng = 80.25181 where id = 'P2-137';
update sites set lat = 13.133554, lng = 80.193209 where id = 'P2-207';
update sites set lat = 13.130297, lng = 80.213279 where id = 'P2-197';
update sites set lat = 13.165158, lng = 80.25344 where id = 'P2-177';
update sites set lat = 13.145218, lng = 80.182537 where id = 'P2-203';
update sites set lat = 13.123107, lng = 80.287151 where id = 'P2-241';
update sites set lat = 13.133945, lng = 80.296779 where id = 'P2-232';
update sites set lat = 13.138687, lng = 80.293354 where id = 'P2-235';
update sites set lat = 13.121485, lng = 80.274671 where id = 'P2-238';
update sites set lat = 13.112482, lng = 80.274571 where id = 'P2-277';
update sites set lat = 13.12345, lng = 80.272564 where id = 'P2-273';

-- Not found in the existing list (likely part of the incomplete Package 4 extraction) — adding as new sites
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P4-nc-1', 'P4', '11', 'Valasaravakkam', '143', 'Mugappiar West Road', 'New Construction', 'New Construction', 13.0802, 80.161709) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P4-nc-2', 'P4', '11', 'Valasaravakkam', '143', 'Madha Kovil Street', 'New Construction', 'New Construction', 13.070588, 80.17448) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P4-nc-3', 'P4', '12', 'Alandur', '157', 'Periyar Colony', 'New Construction', 'New Construction', 13.015304, 80.168949) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P4-nc-4', 'P4', '13', 'Adyar', '170', 'Poniamman Kovil Street', 'New Construction', 'New Construction', 13.01797, 80.241579) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P4-nc-5', 'P4', '14', 'Perungudi', '189', 'Perungudi Dumping Yard', 'New Construction', 'New Construction', 12.953747, 80.229607) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P4-nc-6', 'P4', '14', 'Perungudi', '170', 'Gypsy Colony', 'New Construction', 'New Construction', 13.01479, 80.244277) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P4-nc-7', 'P4', '15', 'Sholinganallur', '198', 'KALIAMMAN KOVIL STREET NEAR AMMA UNAVAGAM', 'New Construction', 'New Construction', 12.915657, 80.233698) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P4-nc-8', 'P4', '15', 'Sholinganallur', '200', 'DN OFFICE BACKSIDE', 'New Construction', 'New Construction', 12.858772, 80.2277) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-1', 'P2', '1', 'Thiruvottiyur', '11', 'Market Lane', 'New Construction', 'New Construction', 13.15183, 80.302578) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-2', 'P2', '1', 'Thiruvottiyur', '3', 'JJ Nagar 1st Street', 'New Construction', 'New Construction', 13.188893, 80.311735) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-3', 'P2', '1', 'Thiruvottiyur', '5', 'INFRONT OF MRF OPEN PARK ENNORE EXPRESS ROAD', 'New Construction', 'New Construction', 13.17493, 80.31245) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-4', 'P2', '1', 'Thiruvottiyur', '4', 'Thiruvedi Amman 5th street', 'New Construction', 'New Construction', 13.191907, 80.304614) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-5', 'P2', '1', 'Thiruvottiyur', '2', 'Periyakuppam Old', 'New Construction', 'New Construction', 13.213149, 80.324566) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-6', 'P2', '1', 'Thiruvottiyur', '3', 'Kasikovikuppam bio toilet', 'New Construction', 'New Construction', 13.190297, 80.313325) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-7', 'P2', '1', 'Thiruvottiyur', '11', 'Vedhachalam Avenue', 'New Construction', 'New Construction', 13.158957, 80.305395) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-8', 'P2', '2', 'Manali', '22', 'EVR Periyar Street', 'New Construction', 'New Construction', 13.158243, 80.259543) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-9', 'P2', '2', 'Manali', '22', 'Karunanithi Street', 'New Construction', 'New Construction', 13.159904, 80.258761) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-10', 'P2', '2', 'Manali', '15', 'Old Nappalayam CPS (Lakshmi Nagar)', 'New Construction', 'New Construction', 13.223136, 80.274381) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-11', 'P2', '2', 'Manali', '20', 'OTTRAVADI STREET', 'New Construction', 'New Construction', 13.175119, 80.252974) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-12', 'P2', '2', 'Manali', '17', 'Theyambakkam', 'New Construction', 'New Construction', 13.195879, 80.235107) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-13', 'P2', '2', 'Manali', '15', 'Edayanchavadi Burial Ground', 'New Construction', 'New Construction', 13.209671, 80.283638) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-14', 'P2', '2', 'Manali', '15', 'Periya Eachankuzhi Burial Ground', 'New Construction', 'New Construction', 13.20581 , 80.273723) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-15', 'P2', '2', 'Manali', '15', 'NEW NAPPALAYAM BURIAL GROUND', 'New Construction', 'New Construction', 13.21642, 80.274757) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-16', 'P2', '3', 'Madhavaram', '32', 'Parapankulam near Kadapa
Road', 'New Construction', 'New Construction', 13.132106, 80.198113) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-17', 'P2', '3', 'Madhavaram', '30', 'Madhavaram Roundana locn changed to PRH Road opposite to Maya Hospital', 'New Construction', 'New Construction', 13.132048, 80.212255) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-18', 'P2', '3', 'Madhavaram', '31', 'Bajanai Kovil Street', 'New Construction', 'New Construction', 13.150864, 80.202625) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-19', 'P2', '4', 'Tondiarpet', '45', 'BVNagar 18th Street', 'New Construction', 'New Construction', 13.115138, 80.257653) on conflict (id) do nothing;
insert into sites (id, package, zone, zone_name, ward, name, type, category, lat, lng) values ('P2-nc-20', 'P2', '4', 'Tondiarpet', '47', 'Meenambal Nagar Cross Street', 'New Construction', 'New Construction', 13.116001, 80.275772) on conflict (id) do nothing;
-- Blank status rows for the newly added sites, matching the rest of the app's baseline
insert into site_status (site_id, status)
values ('P4-nc-1', 'unknown'), ('P4-nc-2', 'unknown'), ('P4-nc-3', 'unknown'), ('P4-nc-4', 'unknown'), ('P4-nc-5', 'unknown'), ('P4-nc-6', 'unknown'), ('P4-nc-7', 'unknown'), ('P4-nc-8', 'unknown'), ('P2-nc-1', 'unknown'), ('P2-nc-2', 'unknown'), ('P2-nc-3', 'unknown'), ('P2-nc-4', 'unknown'), ('P2-nc-5', 'unknown'), ('P2-nc-6', 'unknown'), ('P2-nc-7', 'unknown'), ('P2-nc-8', 'unknown'), ('P2-nc-9', 'unknown'), ('P2-nc-10', 'unknown'), ('P2-nc-11', 'unknown'), ('P2-nc-12', 'unknown'), ('P2-nc-13', 'unknown'), ('P2-nc-14', 'unknown'), ('P2-nc-15', 'unknown'), ('P2-nc-16', 'unknown'), ('P2-nc-17', 'unknown'), ('P2-nc-18', 'unknown'), ('P2-nc-19', 'unknown'), ('P2-nc-20', 'unknown')
on conflict (site_id) do nothing;