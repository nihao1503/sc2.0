# Site Register — deployment guide

A real login system for tracking construction status across Package 2 and
Package 4. Supervisors only ever see their own package's sites (the database
enforces this, not just the screen); your dad signs in once and sees both
packages on the same page.

Two free accounts get this live: **Supabase** (database + real user logins)
and **Vercel** (hosts the website). Total cost: ₹0 to start.

---

## 1. Create the database (Supabase)

1. Go to [supabase.com](https://supabase.com) → sign up (free) → **New project**.
   Pick any name and a database password (save it somewhere).
2. Once the project is ready, open **SQL Editor** (left sidebar) → **New query**.
3. Paste the contents of `supabase/schema.sql` and click **Run**.
   This creates the tables and the access-control rules — a Package 2
   supervisor's account will *only* ever be able to query Package 2 rows,
   enforced by the database itself.
4. New query again → paste the contents of `supabase/seed_sites.sql` → **Run**.
   This loads all 516 sites from the MIOP documents.

## 2. Create logins for your team

There's no public "sign up" page on purpose — you create each account so you
control exactly who gets in.

For each supervisor (and your dad):
1. In Supabase, go to **Authentication → Users → Add user → Create new user**.
   Enter their email and a temporary password. Untick "Auto Confirm" only if
   you want them to verify by email — for a small team, ticking "Auto Confirm"
   is simplest so they can log in immediately.
2. Copy the **User UID** it generates (a long string like `a1b2c3d4-...`).
3. In **SQL Editor**, run one insert per person:

```sql
insert into profiles (id, name, role, package, zones) values
  ('paste-the-user-uid-here', 'Supervisor Name', 'supervisor', 'P2', array['1','2']);
```

- `package` is `'P2'` or `'P4'`.
- `zones` is the specific zones that person is responsible for — Package 2 zones
  are `'1'`,`'2'`,`'3'`,`'4'`; Package 4 zones are `'11'` through `'15'`. Since
  you're currently short-staffed (3 people covering Package 2's 4 zones, 2
  covering Package 4's 5), just list whichever zones each person actually
  covers, e.g. `array['1','2']` for someone covering two zones.
- For your dad (sees everything, no zone limit), use:

```sql
insert into profiles (id, name, role, package, zones) values
  ('paste-his-user-uid-here', 'Your Dad''s Name', 'admin', null, null);
```

**If you already ran the old schema.sql before this update:** run
`supabase/migration_zones_and_accountability.sql` once in the SQL editor
first — it adds the `zones` column and the accountability access rules
without touching your existing sites or statuses. Then re-run the inserts
above with zones included (or `update profiles set zones = array['1','2']
where id = '...'` for accounts you already created).

Give each person their email + temporary password to log in with — they can
change the password later from Supabase if you set that up, or you just issue
a new one if they forget it.

## 3. Get your API keys

In Supabase: **Project Settings → API**. You need two values:
- **Project URL**
- **anon public** key

## 4. Deploy the website (Vercel)

1. Go to [vercel.com](https://vercel.com) → sign up (free).
2. You'll need this project in a GitHub repository — easiest path:
   - Create a new empty repo on [github.com](https://github.com/new).
   - Upload this whole folder to it (GitHub's web uploader works fine for this,
     or `git init && git add . && git commit -m "init" && git push`).
3. In Vercel: **Add New → Project** → import that GitHub repo.
4. Before deploying, add two **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Project URL from step 3
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon public key from step 3
5. Click **Deploy**. In about a minute you'll get a live URL like
   `site-register-xyz.vercel.app` — share that with your team.

## 5. Day-to-day use

- Everyone goes to the same URL and signs in with their own email/password.
- Package 2 supervisors see only Package 2. Package 4 supervisors see only
  Package 4. Your dad sees both, stacked on one page.
- Clicking any site opens the update panel — status, reason, note, name.
- "Export CSV" on each package's view gives a snapshot for sharing with GCC
  or the Independent Engineer.
- To add or fix Package 4 sites (the MIOP extraction for that package was
  incomplete — see note below), an admin can run an `insert into sites (...)`
  statement in the Supabase SQL editor, or ask me to add a proper "add site"
  screen to the app.

## Accountability

Your dad's dashboard now includes a **Supervisor accountability** panel showing,
per supervisor: which zones they own, when they last logged any update, whether
that was today, and how many of their sites are sitting overdue (Active/Halted/
never-reported sites untouched for 2+ days — Completed and Not-started sites
don't count, since they don't need daily attention). Rows for anyone who hasn't
updated today sort to the top.

Supervisors see a gentler version: a banner on their own dashboard if they
haven't logged anything that day yet.

## Photo proof with location

Every status update requires at least one fresh photo, but a supervisor can
add up to 5 if one angle isn't enough — the file picker stays available until
they hit that limit. Location is captured once (from the first photo) and
shared across the whole batch, since they're all taken during the same visit.

**Photos are automatically deleted after 14 days** to keep storage from
filling up — this runs as part of the daily cron job
emails (see below), so no separate setup is needed. Deleting a photo clears
the image itself and its location data, but leaves the status/reason/note
history intact — only the picture goes away.

Every status update now requires a fresh photo taken at the moment of saving,
with the phone's GPS location captured alongside it — so an update can't be
logged without actually visiting the site. This uses the phone's camera and
location permissions (the browser will prompt for both the first time).

For the 80 "New Construction" sites where you supplied real coordinates (from
your Google My Maps exports), the app checks the photo's GPS against the
site's registered location and flags anything more than 200m off — both to
the supervisor before they save, and to your dad afterward, so a mismatch
never blocks the update, just gets surfaced for a second look. Sites without
known coordinates (everything else) just record and display the location —
no automatic flagging, since there's nothing to check it against yet.

**If your database is already live**, run these two migrations once in the
Supabase SQL editor, in order:
1. `supabase/migration_geotagged_photos.sql` — adds the photo/location columns
   and creates the private storage bucket.
2. `supabase/migration_geo_coordinates.sql` — adds the `lat`/`lng` columns and
   loads the 80 New Construction coordinates (52 matched to existing sites,
   28 added as new sites that weren't in the original extraction).

**For a brand-new deployment**, `schema.sql` and `seed_sites.sql` already
include the photo columns and storage bucket — just additionally run
`supabase/seed_new_construction_coords.sql` after seeding to load the
coordinates.

## Daily cleanup job (reminders removed)

The WhatsApp/Twilio check-in reminders were removed because they cost money.
The daily cron (`vercel.json` -> `/api/daily-checkin-reminder`) now only
deletes photos older than 14 days. It needs these Vercel env vars:
`CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never commit it).

Test it: `curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://sc2-0.vercel.app/api/daily-checkin-reminder`
-> returns `{"ok":true,"cleanup":{...}}`.

**To bring reminders back later:** `npm install twilio`, add a loop in the
handler that finds supervisors with no update today (profiles.phone still
exists) and sends via Twilio, and set TWILIO_* env vars. Business-initiated
WhatsApp messages need an approved template and a paid Twilio account.

## Data note

Package 2's 285 sites were extracted cleanly from the MIOP PDF. Package 4's
list (322 sites per the MIOP) came from far messier tables in that PDF —
around 231 sites made it through reliably. The missing ~90 can be added via
the Supabase SQL editor, or ask for an in-app "add site" form for your dad or
an admin to use directly.

## If something goes wrong

- **"No profile found for this account"** — the login worked, but no row
  exists for them in the `profiles` table yet. Re-check step 2.
- **Blank site list** — check the environment variables in Vercel exactly
  match Supabase's Project URL and anon key (Vercel → Project → Settings →
  Environment Variables → redeploy after changing).
- Local testing before deploying: copy `.env.example` to `.env.local`, fill
  in your Supabase values, then run `npm install && npm run dev`.
