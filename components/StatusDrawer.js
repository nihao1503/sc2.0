import { useState, useEffect, useRef } from 'react';
import { HALT_REASONS } from '../lib/constants';
import { getCurrentPosition, uploadSitePhoto, mapsLink, checkLocationMismatch } from '../lib/photo';

const MAX_PHOTOS = 5;

function fmtDate(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function StatusDrawer({ site, currentStatus, myName, requirePhoto = true, onClose, onSave }) {
  const [status, setStatus] = useState(currentStatus?.status || 'unknown');
  const [reason, setReason] = useState(currentStatus?.reason || HALT_REASONS[0]);
  const [note, setNote] = useState(currentStatus?.note || '');
  const [updatedBy, setUpdatedBy] = useState(myName || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // photos: [{ file, previewUrl }], up to MAX_PHOTOS. Location is captured
  // once (from the first photo) and shared across the whole batch, since
  // they're all taken standing at the same site during the same visit.
  const [photos, setPhotos] = useState([]);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setStatus(currentStatus?.status || 'unknown');
    setReason(currentStatus?.reason || HALT_REASONS[0]);
    setNote(currentStatus?.note || '');
    setPhotos([]);
    setLocation(null);
    setLocationError('');
    setSaveError('');
  }, [site, currentStatus]);

  if (!site) return null;

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isFirst = photos.length === 0;
    setPhotos(prev => [...prev, { file, previewUrl: URL.createObjectURL(file) }]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (isFirst) {
      setLocationError('');
      setLocating(true);
      try {
        const pos = await getCurrentPosition();
        setLocation(pos);
      } catch (err) {
        setLocation(null);
        setLocationError(
          err.code === 1
            ? 'Location permission denied — please allow location access and try again.'
            : 'Could not get location. Check your GPS/location is turned on and retry.'
        );
      }
      setLocating(false);
    }
  }

  function removePhoto(index) {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }

  function retryLocation() {
    if (photos.length === 0) return;
    setLocationError('');
    setLocating(true);
    getCurrentPosition()
      .then(pos => { setLocation(pos); setLocating(false); })
      .catch(err => {
        setLocation(null);
        setLocating(false);
        setLocationError(err.code === 1
          ? 'Location permission denied — please allow location access and try again.'
          : 'Could not get location. Try again.');
      });
  }

  const photoReady = !requirePhoto || photos.length > 0;
  const canSave = status !== 'unknown' && photoReady && !locating;
  const mismatch = location ? checkLocationMismatch(site, location.lat, location.lng) : null;

  async function handleSave() {
    setSaveError('');
    setSaving(true);
    try {
      const uploadedPaths = [];
      for (const p of photos) {
        const path = await uploadSitePhoto(site.id, p.file);
        uploadedPaths.push(path);
      }
      const primaryPath = uploadedPaths[0] || null;
      const extraPaths = uploadedPaths.slice(1);

      await onSave(site.id, {
        status,
        reason: status === 'halted' ? reason : '',
        note,
        updatedBy,
        photoPath: primaryPath,
        photoLat: location?.lat ?? null,
        photoLng: location?.lng ?? null,
        photoAccuracyM: location?.accuracy ?? null,
        photoTakenAt: primaryPath ? new Date().toISOString() : null,
        extraPhotoPaths: extraPaths,
      });
    } catch (err) {
      setSaveError('Could not save: ' + (err.message || 'unknown error'));
    }
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

        <div className="field">
          <label>
            {requirePhoto ? 'Photo proof (required) — take it standing at the site' : 'Photo proof (optional)'}
            {photos.length > 0 && ` — ${photos.length}/${MAX_PHOTOS}`}
          </label>
          {photos.length < MAX_PHOTOS && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
            />
          )}
        </div>

        {photos.length > 0 && (
          <div className="field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {photos.map((p, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={p.previewUrl} alt={`Site proof ${i + 1}`} style={{ width: '100%', borderRadius: 3, border: '1px solid var(--line)', display: 'block' }} />
                <button
                  onClick={() => removePhoto(i)}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(28,35,33,0.75)', color: '#fff', border: 'none', borderRadius: 3, width: 22, height: 22, cursor: 'pointer', fontSize: 13 }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        {photos.length > 0 && photos.length < MAX_PHOTOS && (
          <p className="small-note" style={{ marginTop: -8, marginBottom: 14 }}>
            Only need one photo? You're done. Have more angles to show ({MAX_PHOTOS - photos.length} more allowed)? Use the file picker above again.
          </p>
        )}

        {locating && <p className="small-note">Getting your location…</p>}

        {location && !locating && (
          <p className="small-note">
            📍 Location captured (±{Math.round(location.accuracy)}m) —{' '}
            <a href={mapsLink(location.lat, location.lng)} target="_blank" rel="noreferrer">view on map</a>
          </p>
        )}

        {mismatch?.mismatch && (
          <div className="caveat" style={{ marginBottom: 14 }}>
            ⚠ You're about {Math.round(mismatch.distance)}m from this site's registered location. You can still save — this will be flagged for your admin to review.
          </div>
        )}

        {locationError && (
          <div className="caveat" style={{ marginBottom: 14 }}>
            {locationError} You can still save without location — it'll be flagged as missing location for review.{' '}
            <span className="edit-link" onClick={retryLocation}>Retry location</span>
          </div>
        )}

        {requirePhoto && photos.length === 0 && (
          <p className="hint">A fresh photo is required to save (up to {MAX_PHOTOS} allowed if you need more than one angle). Location is captured automatically if available — if it fails, you can still save, but it'll be flagged for review.</p>
        )}

        <div className="hint">
          Last updated: {currentStatus?.updated_at ? `${fmtDate(currentStatus.updated_at)}${currentStatus.updated_by ? ' by ' + currentStatus.updated_by : ''}` : 'never'}
        </div>

        {saveError && <div className="caveat" style={{ marginBottom: 14 }}>{saveError}</div>}

        <button className="btn" style={{ width: '100%' }} disabled={saving || !canSave} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save update'}
        </button>
      </div>
    </div>
  );
}
