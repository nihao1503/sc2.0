import { Resend } from 'resend';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export default async function handler(req, res) {
  // Only Vercel's own cron scheduler (or someone with the secret) can trigger this.
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = getSupabaseAdmin();

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

    const resend = new Resend(process.env.RESEND_API_KEY);
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

      // Look up their email via the auth admin API (profiles doesn't store email).
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(sup.id);
      if (userErr || !userData?.user?.email) {
        results.push({ supervisor: sup.name, skipped: true, reason: 'no email found' });
        continue;
      }

      const email = userData.user.email;
      const zoneList = (sup.zones || []).join(', ') || 'your assigned zones';

      await resend.emails.send({
        from: process.env.REMINDER_FROM_EMAIL || 'Site Register <onboarding@resend.dev>',
        to: email,
        subject: "You haven't logged today's site update yet",
        html: `
          <p>Hi ${sup.name},</p>
          <p>As of 11:00 AM, no update has been logged today for your assigned zones (${zoneList}) in the Site Register.</p>
          <p>Please log in and update your sites as soon as you can:</p>
          <p><a href="${appUrl}">${appUrl}</a></p>
        `,
      });

      results.push({ supervisor: sup.name, email, sent: true });
    }

    return res.status(200).json({ ok: true, results });
  } catch (err) {
    console.error('daily-checkin-reminder failed', err);
    return res.status(500).json({ error: err.message || 'unknown error' });
  }
}
