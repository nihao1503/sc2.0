import { supabase } from './supabaseClient';

// Wraps the browser Geolocation API in a promise.
export function getCurrentPosition(options = { enableHighAccuracy: true, timeout: 15000 }) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This device/browser doesn\'t support location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      err => reject(err),
      options
    );
  });
}

export async function uploadSitePhoto(siteId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${siteId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('site-photos').upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function getSignedPhotoUrl(path, expiresInSeconds = 120) {
  const { data, error } = await supabase.storage.from('site-photos').createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export function mapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// Haversine distance in meters between two lat/lng points.
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// How far a photo's GPS reading can be from the site's registered
// coordinates before it's flagged as a mismatch.
export const LOCATION_MISMATCH_THRESHOLD_M = 200;

// Returns null if the site has no registered coordinates to check against
// (most sites — only ones with real GPS data can be verified this way).
export function checkLocationMismatch(site, photoLat, photoLng) {
  if (site.lat == null || site.lng == null || photoLat == null || photoLng == null) return null;
  const distance = distanceMeters(site.lat, site.lng, photoLat, photoLng);
  return { distance, mismatch: distance > LOCATION_MISMATCH_THRESHOLD_M };
}
