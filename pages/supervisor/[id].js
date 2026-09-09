import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import PackageBoard from '../../components/PackageBoard';
import { computeSupervisorActivity } from '../../lib/accountability';
import { PACKAGE_LABEL } from '../../lib/constants';

function fmtDate(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function SupervisorDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [target, setTarget] = useState(null);
  const [sites, setSites] = useState([]);

  const loadData = useCallback(async () => {
    if (!id) return;
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace('/login'); return; }

    const { data: myProfile } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single();
    if (!myProfile || myProfile.role !== 'admin') {
      setError('Only admins can view supervisor detail pages.');
      setLoading(false);
      return;
    }

    const { data: targetProfile, error: targetErr } = await supabase
      .from('profiles').select('*').eq('id', id).single();
    if (targetErr || !targetProfile) {
      setError('Could not find that supervisor.');
      setLoading(false);
      return;
    }
    setTarget(targetProfile);

    const { data: siteRows, error: sitesErr } = await supabase
      .from('sites')
      .select('*, site_status(status, reason, note, updated_by, updated_at, photo_path, photo_lat, photo_lng, photo_accuracy_m, photo_taken_at)')
      .order('zone', { ascending: true });

    if (sitesErr) {
      setError('Could not load sites: ' + sitesErr.message);
      setLoading(false);
      return;
    }

    const normalized = (siteRows || []).map(s => ({
      ...s,
      status: Array.isArray(s.site_status) ? s.site_status[0] : s.site_status,
    })).filter(s =>
      s.package === targetProfile.package && (targetProfile.zones || []).includes(s.zone)
    );
    setSites(normalized);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="wrap"><p>Loading…</p></div>;
  if (error) return <div className="wrap"><div className="caveat">{error}</div><p><Link href="/dashboard">← Back to dashboard</Link></p></div>;

  const activity = computeSupervisorActivity([target], sites)[0];
  const updatedSites = sites.filter(s => s.status?.updated_at);

  return (
    <div>
      <header className="top">
        <div className="wrap">
          <div>
            <h1>{target.name}</h1>
            <div className="sub">
              {PACKAGE_LABEL[target.package] || target.package} · Zones: {(target.zones || []).join(', ') || '—'}
            </div>
          </div>
          <div className="who">
            <Link href="/dashboard" style={{ color: '#CFD3C9' }}>← Back to dashboard</Link>
          </div>
        </div>
      </header>

      <div className="wrap">
        <div className="stat-row">
          <div className="stat-card total"><div className="n mono">{sites.length}</div><div className="l">Sites owned</div></div>
          <div className={`stat-card ${activity.updatedToday ? 'active' : 'halted'}`}>
            <div className="n mono">{activity.updatedToday ? 'Yes' : 'No'}</div><div className="l">Updated today</div>
          </div>
          <div className="stat-card notstarted"><div className="n mono">{activity.overdueCount}</div><div className="l">Overdue sites</div></div>
          <div className="stat-card halted"><div className="n mono">{activity.flaggedCount}</div><div className="l">Flagged updates</div></div>
          <div className="stat-card completed"><div className="n mono" style={{ fontSize: 15 }}>{fmtDate(activity.lastActivity)}</div><div className="l">Last activity</div></div>
        </div>

        <p className="small-note" style={{ marginBottom: 20 }}>
          This is a read-only view of everything {target.name} has reported. To make a correction, use the site's entry on the main dashboard.
        </p>

        {updatedSites.length === 0 ? (
          <div className="panel"><p className="small-note">No updates logged yet.</p></div>
        ) : (
          <PackageBoard pkg={target.package} sites={sites} onOpenSite={() => {}} showHeading={false} />
        )}
      </div>
    </div>
  );
}
