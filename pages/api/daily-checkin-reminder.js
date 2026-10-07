import twilio from 'twilio';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

const PHOTO_RETENTION_DAYS = 14;

async function cleanupOldPhotos(supabase) {
  const cutoffIso = new Date(Date.now() - PHOTO_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: staleStatus, error: staleStatusErr } = await supabase
    .from('site_status')
    .select('site_id, photo_path')
    .not('photo_path', 'is', null)
    .lt('photo_taken_at', cutoffIso);
  if (staleStatusErr) throw staleStatusErr;

  const { data: stalePhotos, error: stalePhotosErr } = await supabase
    .from('site_photos')
    .select('id, photo_path')
    .lt('created_at', cutoffIso);
  if (stalePhotosErr) throw stalePhotosErr;

  const pathsToDelete = [
    ...(staleStatus || []).map(s => s.photo_path),
    ...(stalePhotos || []).map(p => p.photo_path),
  ].filter(Boolean);

  if (pathsToDelete.length > 0) {
    const { error: removeErr } = await supabase.storage.from('site-photos').remove(pathsToDelete);
    if (removeErr) throw removeErr;
  }

  if ((staleStatus || []).length > 0) {
    const { error: clearErr } = await supabase
      .from('site_status')
      .update({ photo_path: null, photo_lat: null, photo_lng: null, photo_accuracy_m: null, photo_taken_at: null })
      .lt('photo_taken_at', cutoffIso);
    if (clearErr) throw clearErr;
  }

  if ((stalePhotos || []).length > 0) {
    const { error: deleteErr } = await supabase
      .from('site_photos')
      .delete()
      .lt('created_at', cutoffIso);
    if (deleteErr) throw deleteErr;
  }

  return {
    primaryPhotosCleared: (staleStatus || []).length,
    extraPhotosDeleted: (stalePhotos || []).length,
    filesRemoved: pathsToDelete.length,
  };
}

export default async function handler(req, res) {
  // Only Vercel's own cron scheduler (or someone with the secret) can trigger this.
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = getSupabaseAdmin();

    const cleanup = await cleanupOldPhotos(supabase);

    const { data: supervisors, error: supError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'supervisor');
    if (supError) throw supError;

    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id, package, zone, site_status(updated_at)')
      .eq('in_current_scope', true);
    if (sitesError) throw sitesError;

    const normalized = (sites || []).map(s => ({
      ...s,
      status: Array.isArray(s.site_status) ? s.site_status[0] : s.site_status,
    }));

    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // e.g. 'whatsapp:+14155238886'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app';

    const results = [];

    for (const sup of supervisors || []) {
      const theirSites = normalized.filter(s =>
        s.package === sup.package && (sup.zones || []).includes(s.zone)
      );
      if (theirSites.length === 0) continue;

      let lastActivity = null;
      theirSites.forEach(s => {
        const ts = s.status?.updated_at;
        if (ts && (!lastActivity || new Date(ts) > new Date(lastActivity))) lastActivity = ts;
      });

      if (isToday(lastActivity)) {
        results.push({ supervisor: sup.name, skipped: true, reason: 'already updated today' });
        continue;
      }

      if (!sup.phone) {
        results.push({ supervisor: sup.name, skipped: true, reason: 'no phone number on file' });
        continue;
      }

      const zoneList = (sup.zones || []).join(', ') || 'your assigned zones';

      try {
        await twilioClient.messages.create({
          from: whatsappFrom,
          to: `whatsapp:${sup.phone}`,
          body: `Hi ${sup.name}, as of 11:00 AM no update has been logged today for your assigned zones (${zoneList}) in the Site Register. Please log in and update your sites: ${appUrl}`,
        });
        results.push({ supervisor: sup.name, phone: sup.phone, sent: true });
      } catch (sendErr) {
        results.push({ supervisor: sup.name, phone: sup.phone, sent: false, error: sendErr.message });
      }
    }

    return res.status(200).json({ ok: true, cleanup, results });
  } catch (err) {
    console.error('daily-checkin-reminder failed', err);
    return res.status(500).json({ error: err.message || 'unknown error' });
  }
}
