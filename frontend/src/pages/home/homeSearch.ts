// ===========================================
// SmartProperty - Home search and listing helpers
// ===========================================

import type { Property, PropertyCategory } from "../../types/property";

export type ListingMode = "sale" | "rent";

export interface PriceBand {
  /** Stable option value for the <select>. */
  value: string;
  min?: number;
  max?: number;
}

/**
 * Price bands in TND, the currency every listing uses. Rent is monthly, so
 * it gets its own scale rather than sale-sized bands.
 */
export const PRICE_BANDS: Record<ListingMode, PriceBand[]> = {
  sale: [
    { value: "0-200000", max: 200_000 },
    { value: "200000-500000", min: 200_000, max: 500_000 },
    { value: "500000-1000000", min: 500_000, max: 1_000_000 },
    { value: "1000000+", min: 1_000_000 },
  ],
  rent: [
    { value: "0-1000", max: 1_000 },
    { value: "1000-2000", min: 1_000, max: 2_000 },
    { value: "2000-5000", min: 2_000, max: 5_000 },
    { value: "5000+", min: 5_000 },
  ],
};

const formatAmount = (value: number) => value.toLocaleString("en-US");

/** "Up to 1,000 TND", "1,000 – 2,000 TND", "5,000+ TND". */
export function formatPriceBand(
  band: PriceBand,
  labels: { upTo: string; currency: string },
): string {
  if (band.min === undefined && band.max !== undefined) {
    return `${labels.upTo} ${formatAmount(band.max)} ${labels.currency}`;
  }
  if (band.max === undefined && band.min !== undefined) {
    return `${formatAmount(band.min)}+ ${labels.currency}`;
  }
  return `${formatAmount(band.min ?? 0)} – ${formatAmount(band.max ?? 0)} ${labels.currency}`;
}

export interface HomeSearchInput {
  mode: ListingMode;
  location: string;
  type: string;
  rooms: string;
  price: string;
}

/**
 * Query string for /properties. Uses the parameters the listings page
 * actually reads: `category`, `minPrice` and `maxPrice` rather than the
 * `listingType` / `priceRange` it used to send and the page ignored.
 */
export function buildHomeSearchParams(input: HomeSearchInput): URLSearchParams {
  const params = new URLSearchParams();
  params.set("category", input.mode === "rent" ? "rental" : "sale");

  const location = input.location.trim();
  if (location) params.set("search", location);
  if (input.type) params.set("type", input.type);
  if (input.rooms) params.set("bedrooms", input.rooms);

  const band = PRICE_BANDS[input.mode].find((b) => b.value === input.price);
  if (band?.min !== undefined) params.set("minPrice", String(band.min));
  if (band?.max !== undefined) params.set("maxPrice", String(band.max));

  return params;
}

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
