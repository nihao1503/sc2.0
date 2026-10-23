// Daily maintenance job (Vercel Cron). Currently only deletes photos older than
// PHOTO_RETENTION_DAYS. WhatsApp reminders were removed (cost); see README.
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

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

    return res.status(200).json({ ok: true, cleanup });
  } catch (err) {
    console.error('photo cleanup cron failed', err);
    return res.status(500).json({ error: err.message || 'unknown error' });
  }
}
