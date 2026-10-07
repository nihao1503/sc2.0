-- ============================================================
-- Migration: add phone numbers for WhatsApp reminders
-- Run this once in the Supabase SQL editor.
-- ============================================================

alter table profiles add column if not exists phone text;

-- Set each supervisor's WhatsApp number in E.164 format (country code, no
-- spaces or dashes) — e.g. +919876543210 for an Indian mobile number.
-- Example (replace with real UUIDs and numbers):
-- update profiles set phone = '+919876543210' where id = 'uuid-of-supervisor-1';
-- update profiles set phone = '+919812345678' where id = 'uuid-of-supervisor-2';
