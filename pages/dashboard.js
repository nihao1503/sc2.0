import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import PackageBoard from '../components/PackageBoard';
import StatusDrawer from '../components/StatusDrawer';
import SupervisorAccountability from '../components/SupervisorAccountability';
import { computeSupervisorActivity, isToday } from '../lib/accountability';

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [sites, setSites] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openSite, setOpenSite] = useState(null);
  const [toast, setToast] = useState('');

  const loadData = useCallback(async () => {
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace('/login'); return; }

    const { data: profileRow, error: profileErr } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single();
    if (profileErr || !profileRow) {
      setError('No profile found for this account. Ask your admin to set up your role in the profiles table.');
      setLoading(false);
      return;
    }
    setProfile(profileRow);

    const { data: siteRows, error: sitesErr } = await supabase
      .from('sites')
      .select('*, site_status(status, reason, note, updated_by, updated_at)')
      .order('zone', { ascending: true });

    if (sitesErr) {
      setError('Could not load sites: ' + sitesErr.message);
      setLoading(false);
      return;
    }

    const normalized = (siteRows || []).map(s => ({
      ...s,
      status: Array.isArray(s.site_status) ? s.site_status[0] : s.site_status,
    }));
    setSites(normalized);

    if (profileRow.role === 'admin') {
      const { data: supervisorRows } = await supabase
        .from('profiles').select('*').eq('role', 'supervisor');
      setSupervisors(supervisorRows || []);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSave(siteId, { status, reason, note, updatedBy }) {
    const { error } = await supabase.from('site_status').upsert({
      site_id: siteId, status, reason, note, updated_by: updatedBy, updated_at: new Date().toISOString(),
    });
    if (error) {
      setToast('Save failed: ' + error.message);
      setTimeout(() => setToast(''), 3500);
      return;
    }
    setSites(prev => prev.map(s => s.id === siteId
      ? { ...s, status: { status, reason, note, updated_by: updatedBy, updated_at: new Date().toISOString() } }
      : s));
    setToast('Status saved');
    setTimeout(() => setToast(''), 2500);
    setOpenSite(null);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (loading) return <div className="wrap"><p>Loading…</p></div>;
  if (error) return <div className="wrap"><div className="caveat">{error}</div></div>;

  const isAdmin = profile?.role === 'admin';
  const packages = isAdmin ? ['P2', 'P4'] : [profile?.package].filter(Boolean);

  const activity = useMemo(
    () => isAdmin ? computeSupervisorActivity(supervisors, sites) : [],
    [isAdmin, supervisors, sites]
  );

  const myLastActivity = useMemo(() => {
    if (isAdmin) return null;
    let latest = null;
    sites.forEach(s => {
      const ts = s.status?.updated_at;
      if (ts && (!latest || new Date(ts) > new Date(latest))) latest = ts;
    });
    return latest;
  }, [isAdmin, sites]);

  return (
    <div>
      <header className="top">
        <div className="wrap">
          <div>
            <h1>Site Register</h1>
            <div className="sub">Sumeet Creator Infrastructure &middot; DBFOT Public Toilets, GCC</div>
          </div>
          <div className="who">
            Signed in as <strong>{profile?.name}</strong> ({isAdmin ? 'Admin — both packages' : profile?.package})
            <button onClick={handleSignOut}>Sign out</button>
          </div>
        </div>
      </header>

      <div className="wrap">
        {isAdmin && <SupervisorAccountability activity={activity} />}

        {!isAdmin && sites.length > 0 && !isToday(myLastActivity) && (
          <div className="caveat">
            You haven't logged an update today across your {sites.length} assigned site{sites.length === 1 ? '' : 's'}.
            Your admin can see this — take a minute to check in on anything active or halted.
          </div>
        )}

        {packages.map(pkg => (
          <PackageBoard
            key={pkg}
            pkg={pkg}
            sites={sites.filter(s => s.package === pkg)}
            onOpenSite={setOpenSite}
            showHeading={isAdmin}
          />
        ))}
      </div>

      {openSite && (
        <StatusDrawer
          site={openSite}
          currentStatus={openSite.status}
          myName={profile?.name}
          onClose={() => setOpenSite(null)}
          onSave={handleSave}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
