import { useMemo, useState } from 'react';
import { STATUS_LABEL, PACKAGE_LABEL } from '../lib/constants';
import { isSiteOverdue, daysSince } from '../lib/accountability';
import { getSignedPhotoUrl, mapsLink, checkLocationMismatch } from '../lib/photo';

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function PackageBoard({ pkg, sites, onOpenSite, showHeading = true }) {
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const zones = useMemo(() => {
    const seen = new Map();
    sites.forEach(s => { if (!seen.has(s.zone)) seen.set(s.zone, s.zone_name); });
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [sites]);

  const counts = useMemo(() => {
    const c = { active: 0, halted: 0, notstarted: 0, completed: 0, unknown: 0 };
    sites.forEach(s => { const st = s.status?.status || 'unknown'; c[st] = (c[st] || 0) + 1; });
    return c;
  }, [sites]);

  const reasonCounts = useMemo(() => {
    const rc = {};
    sites.forEach(s => {
      if (s.status?.status === 'halted' && s.status.reason) {
        rc[s.status.reason] = (rc[s.status.reason] || 0) + 1;
      }
    });
    return Object.entries(rc).sort((a, b) => b[1] - a[1]);
  }, [sites]);

  const zoneStats = useMemo(() => {
    const zm = {};
    sites.forEach(s => {
      if (!zm[s.zone]) zm[s.zone] = { zoneName: s.zone_name, active: 0, halted: 0, notstarted: 0, completed: 0, unknown: 0, total: 0 };
      const st = s.status?.status || 'unknown';
      zm[s.zone][st]++;
      zm[s.zone].total++;
    });
    return Object.entries(zm).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sites]);

  const overdueCount = useMemo(() => sites.filter(isSiteOverdue).length, [sites]);

  const filtered = useMemo(() => {
    return sites.filter(s => {
      if (zoneFilter !== 'ALL' && s.zone !== zoneFilter) return false;
      if (statusFilter === 'OVERDUE') {
        if (!isSiteOverdue(s)) return false;
      } else {
        const st = s.status?.status || 'unknown';
        if (statusFilter !== 'ALL' && st !== statusFilter) return false;
      }
      if (search) {
        const hay = (s.name + ' ' + s.ward + ' ' + s.zone_name).toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [sites, zoneFilter, statusFilter, search]);

  function exportCsv() {
    const header = ['Zone', 'ZoneName', 'Ward', 'Site', 'Type', 'Category', 'Status', 'Reason', 'Note', 'UpdatedBy', 'UpdatedAt', 'PhotoLat', 'PhotoLng'];
    const lines = [header.join(',')];
    filtered.forEach(s => {
      const st = s.status || {};
      const vals = [s.zone, s.zone_name, s.ward, s.name, s.type, s.category,
        STATUS_LABEL[st.status || 'unknown'], st.reason, st.note, st.updated_by, st.updated_at, st.photo_lat, st.photo_lng]
        .map(v => '"' + String(v || '').replace(/"/g, '""') + '"');
      lines.push(vals.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${pkg}-site-register-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const maxReason = reasonCounts.length ? reasonCounts[0][1] : 1;

  async function viewProof(e, path) {
    e.stopPropagation();
    if (!path) return;
    try {
      const url = await getSignedPhotoUrl(path);
      window.open(url, '_blank');
    } catch (err) {
      alert('Could not load photo: ' + (err.message || 'unknown error'));
    }
  }

  return (
    <div className="package-block">
      {showHeading && <h2>{PACKAGE_LABEL[pkg] || pkg}</h2>}

      <div className="stat-row">
        <div className="stat-card total"><div className="n mono">{sites.length}</div><div className="l">Total sites</div></div>
        <div className="stat-card active"><div className="n mono">{counts.active}</div><div className="l">Active</div></div>
        <div className="stat-card halted"><div className="n mono">{counts.halted}</div><div className="l">Halted</div></div>
        <div className="stat-card notstarted"><div className="n mono">{counts.notstarted}</div><div className="l">Not started</div></div>
        <div className="stat-card completed"><div className="n mono">{counts.completed}</div><div className="l">Completed / {counts.unknown} not updated</div></div>
      </div>

      <div className="grid">
        <div className="panel">
          <h3>Filters</h3>
          <div className="field">
            <label>Zone</label>
            <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)}>
              <option value="ALL">All zones</option>
              {zones.map(([z, name]) => <option key={z} value={z}>{name} (Zone {z})</option>)}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">All statuses</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              <option value="OVERDUE">⚠ Overdue ({overdueCount})</option>
            </select>
          </div>
          <div className="field">
            <label>Search site / ward</label>
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. Ennore, ward 12..." />
          </div>

          <h3 style={{ marginTop: 20 }}>Halt reasons</h3>
          {reasonCounts.length === 0
            ? <div className="small-note">No halted sites logged yet.</div>
            : reasonCounts.map(([reason, n]) => (
              <div className="reason-bar-row" key={reason}>
                <div className="rb-label" title={reason}>{reason}</div>
                <div className="rb-track"><div className="rb-fill" style={{ width: `${(n / maxReason) * 100}%` }} /></div>
                <div className="rb-n">{n}</div>
              </div>
            ))}
        </div>

        <div>
          <h3 style={{ margin: '0 0 10px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-soft)' }}>Zone-wise progress</h3>
          <div className="zone-grid">
            {zoneStats.map(([z, zs]) => {
              const pct = n => zs.total ? (n / zs.total * 100) : 0;
              return (
                <div className="zone-card" key={z}>
                  <div className="zp">Zone {z}</div>
                  <div className="zn">{zs.zoneName}</div>
                  <div className="zbar">
                    <span style={{ width: `${pct(zs.active)}%`, background: 'var(--green)' }} />
                    <span style={{ width: `${pct(zs.halted)}%`, background: 'var(--amber)' }} />
                    <span style={{ width: `${pct(zs.completed)}%`, background: 'var(--slate)' }} />
                    <span style={{ width: `${pct(zs.notstarted) + pct(zs.unknown)}%`, background: 'var(--grey)' }} />
                  </div>
                  <div className="zstats"><span>{zs.total} sites</span><span className="mono">{zs.halted} halted</span></div>
                </div>
              );
            })}
          </div>

          <div className="toolbar">
            <button className="btn secondary" onClick={exportCsv}>Export CSV</button>
            <span className="count">{filtered.length} of {sites.length} sites</span>
          </div>

          <div className="table-scroll">
            <table className="reg">
              <thead>
                <tr><th>Zone</th><th>Ward</th><th>Site</th><th>Work type</th><th>Status</th><th>Reason / note</th><th>Proof</th><th>Last updated</th></tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const st = s.status || {};
                  const statusKey = st.status || 'unknown';
                  const overdue = isSiteOverdue(s);
                  const mismatch = checkLocationMismatch(s, st.photo_lat, st.photo_lng);
                  const reasonOrNote = statusKey === 'halted'
                    ? (st.reason || '') + (st.note ? ' — ' + st.note : '')
                    : (st.note || '');
                  return (
                    <tr key={s.id} className={`st-${statusKey}`} onClick={() => onOpenSite(s)}>
                      <td>{s.zone_name}<div className="site-meta">Zone {s.zone}</div></td>
                      <td className="mono">{s.ward || '-'}</td>
                      <td><div className="site-name">{s.name}</div></td>
                      <td>{s.type || '-'}<div className="site-meta">{s.category || ''}</div></td>
                      <td><span className={`badge ${statusKey}`}>{STATUS_LABEL[statusKey]}</span></td>
                      <td><span className="reason-txt">{reasonOrNote}</span></td>
                      <td>
                        {st.photo_path ? (
                          <span className="edit-link" onClick={(e) => viewProof(e, st.photo_path)}>📷 View</span>
                        ) : <span className="site-meta">none</span>}
                        {(s.site_photos || []).length > 0 && (
                          <div style={{ fontSize: 11, marginTop: 2 }}>
                            {s.site_photos.map((p, i) => (
                              <span key={p.id}>
                                <span className="edit-link" onClick={(e) => viewProof(e, p.photo_path)}>+{i + 1}</span>
                                {i < s.site_photos.length - 1 ? ' ' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                        {mismatch?.mismatch && (
                          <div style={{ color: 'var(--amber)', fontSize: 11, fontWeight: 600 }}>
                            ⚠ {Math.round(mismatch.distance)}m off
                          </div>
                        )}
                        {st.photo_path && st.photo_lat == null && (
                          <div style={{ color: 'var(--amber)', fontSize: 11, fontWeight: 600 }}>
                            ⚠ No location
                          </div>
                        )}
                      </td>
                      <td className="updated-meta" style={overdue ? { color: 'var(--amber)', fontWeight: 600 } : undefined}>
                        {overdue && '⚠ '}{st.updated_at ? fmtDate(st.updated_at) : 'never'}{st.updated_by ? <><br />by {st.updated_by}</> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
