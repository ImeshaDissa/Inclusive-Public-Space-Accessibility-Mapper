import { Linking, Platform } from 'react-native';

/**
 * Turn-by-turn handoff from a place to the phone's own maps app.
 *
 * The app is an accessibility mapper: people look up whether a place is
 * step-free or has a ramp, and the very next thing they want is to actually
 * get there. This module is the single place that knows how to leave the app
 * and open directions, so every screen (map, explore, inbox, profile, the
 * deep-linked place page and the AI assistant) behaves identically.
 *
 * Native deep links are tried first so the installed maps app opens directly.
 * If nothing handles the scheme (simulator, tablet, locked-down device, web)
 * we fall back to a universal https URL, which always resolves.
 */

export interface DirectionsTarget {
  name?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}

/** A place is only navigable by coordinates when lat/lng are real. */
export function hasUsableCoords(target: DirectionsTarget): boolean {
  const lat = Number(target.lat);
  const lng = Number(target.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  // (0, 0) is the "null island" placeholder some records carry.
  if (lat === 0 && lng === 0) return false;
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/** "Central Library, 450 Civic Center Plaza" — used as the maps search text. */
export function directionsLabel(target: DirectionsTarget): string {
  return [target.name, target.address].filter((part) => !!part && String(part).trim()).join(', ');
}

/**
 * Universal https link. Works in a browser and is the safety net when no
 * native maps app answers the deep link.
 */
export function webDirectionsUrl(target: DirectionsTarget): string {
  if (hasUsableCoords(target)) {
    const lat = Number(target.lat);
    const lng = Number(target.lng);
    // Google Maps' documented Directions URL. Only `destination` is used:
    // extra empty params (destination_place_id / query) are not valid here and
    // make Maps fall back to an imprecise text match.
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    directionsLabel(target) || 'accessible place'
  )}`;
}

function nativeDirectionsUrl(target: DirectionsTarget): string | null {
  const label = directionsLabel(target);
  if (hasUsableCoords(target)) {
    const lat = Number(target.lat);
    const lng = Number(target.lng);
    if (Platform.OS === 'ios') {
      // Apple Maps: `maps://` opens the app; daddr = driving destination.
      return `maps://?daddr=${lat},${lng}${label ? `&q=${encodeURIComponent(label)}` : ''}`;
    }
    if (Platform.OS === 'android') {
      // geo: opens whichever maps app the user has chosen.
      return `geo:${lat},${lng}?q=${lat},${lng}${label ? `(${encodeURIComponent(label)})` : ''}`;
    }
    return null;
  }
  // No coordinates: fall back to a name/address search in the native app.
  if (!label) return null;
  if (Platform.OS === 'ios') return `maps://?q=${encodeURIComponent(label)}`;
  if (Platform.OS === 'android') return `geo:0,0?q=${encodeURIComponent(label)}`;
  return null;
}

async function tryOpen(url: string): Promise<boolean> {
  // openURL is attempted directly and deliberately NOT gated on canOpenURL:
  // on Android 11+ canOpenURL reports false for schemes such as `geo:` unless
  // the app declares package visibility, which would block a perfectly good
  // handoff to Google Maps. openURL rejects when nothing can handle the URL,
  // which is the signal we actually need.
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Open directions to a place. Never throws — returns false only when every
 * option failed, so callers can show a friendly message.
 */
export async function openDirections(target: DirectionsTarget): Promise<boolean> {
  const webUrl = webDirectionsUrl(target);

  if (Platform.OS === 'web') {
    return tryOpen(webUrl);
  }

  const nativeUrl = nativeDirectionsUrl(target);
  if (nativeUrl && (await tryOpen(nativeUrl))) return true;

  // Native scheme unavailable (no maps app / no coords) — use the https link,
  // which the OS still routes to the default maps app when it is installed.
  return tryOpen(webUrl);
}
