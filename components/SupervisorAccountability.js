import { PACKAGE_LABEL } from '../lib/constants';

function fmtDate(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function daysAgoLabel(iso) {
  if (!iso) return 'never updated';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

export default function SupervisorAccountability({ activity }) {
  if (!activity.length) {
    return (
      <div className="panel" style={{ marginBottom: 24 }}>
        <h3>Supervisor accountability</h3>
        <p className="small-note">No supervisor accounts set up yet.</p>
      </div>
    );
  }

  const sorted = [...activity].sort((a, b) => {
    // Overdue-and-quiet people float to the top
    if (a.updatedToday !== b.updatedToday) return a.updatedToday ? 1 : -1;
    return b.overdueCount - a.overdueCount;
  });

  return (
    <div className="panel" style={{ marginBottom: 24 }}>
      <h3>Supervisor accountability</h3>
      <table className="reg">
        <thead>
          <tr><th>Supervisor</th><th>Package / zones</th><th>Sites owned</th><th>Last activity</th><th>Today?</th><th>Overdue sites</th></tr>
        </thead>
        <tbody>
          {sorted.map(a => (
            <tr key={a.profile.id} className={a.updatedToday ? 'st-active' : 'st-halted'}>
              <td className="site-name">{a.profile.name}</td>
              <td>{PACKAGE_LABEL[a.profile.package] || a.profile.package}
                <div className="site-meta">Zones: {(a.profile.zones || []).join(', ') || '—'}</div>
              </td>
              <td className="mono">{a.siteCount}</td>
              <td className="updated-meta">{fmtDate(a.lastActivity)}<div className="site-meta">{daysAgoLabel(a.lastActivity)}</div></td>
              <td>
                <span className={`badge ${a.updatedToday ? 'active' : 'halted'}`}>
                  {a.updatedToday ? 'Updated today' : 'No update today'}
                </span>
              </td>
              <td className="mono" style={{ color: a.overdueCount > 0 ? 'var(--amber)' : 'var(--ink-soft)' }}>
                {a.overdueCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small-note" style={{ marginTop: 10 }}>
        "Overdue" means a site marked Active, Halted, or never reported on hasn't been touched in 2+ days. Completed and Not-started sites aren't counted — they don't need daily updates.
      </p>
    </div>
  );
}
