// ===========================================
// SmartProperty - Address geocoding (Nominatim)
// ===========================================

import type { Property } from "../types/property";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  zoom: number;
}

/** First Nominatim match for a free-text query, or null on no match or error. */
export async function nominatimSearch(
  query: string,
): Promise<NominatimResult | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?format=json&limit=1&addressdetails=1` +
      `&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "SmartProperty-App", "Accept-Language": "en" },
    });
    const data: NominatimResult[] = await res.json();
    return data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

const toResult = (match: NominatimResult, zoom: number): GeocodeResult => ({
  lat: Number.parseFloat(match.lat),
  lng: Number.parseFloat(match.lon),
  zoom,
});

/**
 * Locate an address, falling back from the most precise query to the
 * broadest, and zooming out to match how precise the hit was.
 */
export async function geocodeAddress(
  address: Property["address"],
): Promise<GeocodeResult | null> {
  const { street, city, state, zipCode, country } = address;

  // Full precision: street + city + state + zip + country
  const full = [street, city, state, zipCode, country]
    .filter(Boolean)
    .join(", ");
  const r1 = await nominatimSearch(full);
  if (r1) return toResult(r1, 17);

  // Street + city + country
  const mid = [street, city, country].filter(Boolean).join(", ");
  const r2 = await nominatimSearch(mid);
  if (r2) return toResult(r2, 16);

  // City + state + country (neighbourhood level)
  const broad = [city, state, country].filter(Boolean).join(", ");
  const r3 = await nominatimSearch(broad);
  if (r3) return toResult(r3, 13);

  return null;
}
