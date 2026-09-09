import { checkLocationMismatch } from './photo';

export const STALE_THRESHOLD_DAYS = 2;

// Only these statuses need active day-to-day tracking. A Completed or
// genuinely Not-started site doesn't need to be touched daily.
const NEEDS_TRACKING = new Set(['active', 'halted', 'unknown']);

export function daysSince(iso) {
  if (!iso) return Infinity;
  const diffMs = Date.now() - new Date(iso).getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

export function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

// Is this specific site overdue for an update?
export function isSiteOverdue(site) {
  const statusKey = site.status?.status || 'unknown';
  if (!NEEDS_TRACKING.has(statusKey)) return false;
  return daysSince(site.status?.updated_at) >= STALE_THRESHOLD_DAYS;
}

// Was this site's latest logged update flagged — either its photo's GPS
// didn't match the site's registered location, or no location was captured
// at all when one should have been.
export function isSiteFlagged(site) {
  const st = site.status;
  if (!st?.photo_path) return false;
  if (st.photo_lat == null || st.photo_lng == null) return true;
  const mismatch = checkLocationMismatch(site, st.photo_lat, st.photo_lng);
  return !!mismatch?.mismatch;
}

// Build a per-supervisor accountability summary from the full site list
// (admin's fetch already contains every site+status; RLS lets admins see all).
export function computeSupervisorActivity(supervisorProfiles, allSites) {
  return supervisorProfiles.map(p => {
    const theirSites = allSites.filter(s =>
      s.package === p.package && (p.zones || []).includes(s.zone)
    );
    let lastActivity = null;
    theirSites.forEach(s => {
      const ts = s.status?.updated_at;
      if (ts && (!lastActivity || new Date(ts) > new Date(lastActivity))) {
        lastActivity = ts;
      }
    });
    const overdueSites = theirSites.filter(isSiteOverdue);
    const flaggedSites = theirSites.filter(isSiteFlagged);
    return {
      profile: p,
      siteCount: theirSites.length,
      lastActivity,
      updatedToday: isToday(lastActivity),
      overdueCount: overdueSites.length,
      flaggedCount: flaggedSites.length,
    };
  });
}
