// ===========================================
// SmartProperty - Home page listing helpers
// ===========================================

import type { Property, PropertyCategory } from "../../types/property";

export type ListingBadge = "sale" | "rent" | "managed";

/** Badge for a listing, from what it is offered as - not its status. */
export function listingBadge(
  category: PropertyCategory | undefined,
): ListingBadge {
  if (category === "rental") return "rent";
  if (category === "management") return "managed";
  return "sale";
}

export interface CityCount {
  name: string;
  /** Only present when every listing was counted, so it is never low. */
  count?: number;
}

/**
 * Cities that actually have listings, busiest first. Replaces a hard-coded
 * list whose counts ("Tunis: 245") had nothing to do with the data.
 */
export function topCities(
  listings: Property[],
  total: number,
  limit = 6,
): CityCount[] {
  const byCity = new Map<string, { name: string; count: number }>();
  for (const listing of listings) {
    const name = listing.address?.city?.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase();
    const entry = byCity.get(key) ?? { name, count: 0 };
    entry.count += 1;
    byCity.set(key, entry);
  }

  const complete = total <= listings.length;
  return [...byCity.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ name, count }) => (complete ? { name, count } : { name }));
}
