import { useState, useEffect } from 'react';
import { HALT_REASONS } from '../lib/constants';

function fmtDate(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function StatusDrawer({ site, currentStatus, myName, onClose, onSave }) {
  const [status, setStatus] = useState(currentStatus?.status || 'unknown');
  const [reason, setReason] = useState(currentStatus?.reason || HALT_REASONS[0]);
  const [note, setNote] = useState(currentStatus?.note || '');
  const [updatedBy, setUpdatedBy] = useState(myName || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(currentStatus?.status || 'unknown');
    setReason(currentStatus?.reason || HALT_REASONS[0]);
    setNote(currentStatus?.note || '');
  }, [site, currentStatus]);

  if (!site) return null;

  async function handleSave() {
    setSaving(true);
    await onSave(site.id, { status, reason: status === 'halted' ? reason : '', note, updatedBy });
    setSaving(false);
  }

  return (
    <div className="overlay open" onClick={(e) => { if (e.target.classList.contains('overlay')) onClose(); }}>
      <div className="drawer">
        <button className="close-x" onClick={onClose}>&times;</button>
        <h2>{site.name}</h2>
        <div className="drawer-sub">{site.package} · {site.zone_name} (Zone {site.zone}) · Ward {site.ward || '-'} · {site.type || ''}</div>

        <div className="field"><label>Status</label></div>
        <div className="status-choices">
          {['active', 'halted', 'notstarted', 'completed'].map(s => (
            <button key={s} className={status === s ? `sel-${s}` : ''} onClick={() => setStatus(s)}>
              {{ active: 'Active', halted: 'Halted', notstarted: 'Not started', completed: 'Completed' }[s]}
            </button>
          ))}
        </div>

        {status === 'halted' && (
          <div className="field">
            <label>Reason for halt</label>
            <select value={reason} onChange={e => setReason(e.target.value)}>
              {HALT_REASONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        )}

        <div className="field">
          <label>Note (optional detail)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Any specific detail worth flagging..." />
        </div>

        <div className="field">
          <label>Your name</label>
          <input type="text" value={updatedBy} onChange={e => setUpdatedBy(e.target.value)} placeholder="Who's logging this update" />
        </div>

        <div className="hint">
          Last updated: {currentStatus?.updated_at ? `${fmtDate(currentStatus.updated_at)}${currentStatus.updated_by ? ' by ' + currentStatus.updated_by : ''}` : 'never'}
        </div>

        <button className="btn" style={{ width: '100%' }} disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save update'}
        </button>
      </div>
    </div>
  );
}
