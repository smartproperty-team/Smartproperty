// ===========================================
// Listing search filters: URL, price scale, chips
// ===========================================
// Follows what airbnb.com's search does (read with REA, October 2026):
// every filter lives in the URL, rooms are minimums ("2+"), the price slider
// runs on a square-root scale, and the Filters button counts what is set.

import type { Translations } from "@/i18n/translations/en";
import type {
  PropertyCategory,
  PropertyFilters,
  PropertyStatus,
  PropertyType,
} from "@/types/property";

export const PROPERTY_TYPES: PropertyType[] = [
  "apartment",
  "house",
  "villa",
  "studio",
  "condo",
  "land",
];

export const LISTING_STATUSES: PropertyStatus[] = [
  "available",
  "rented",
  "maintenance",
  "unlisted",
];

export const CATEGORIES: PropertyCategory[] = ["rental", "sale", "management"];

/**
 * Amenities as the property form offers them. Listings store free text, so
 * the API matches them whole and ignoring case ("WiFi" finds "wifi").
 */
export const PROPERTY_AMENITIES = [
  "Air conditioning",
  "Heating",
  "WiFi",
  "Parking",
  "Elevator",
  "Balcony",
  "Terrace",
  "Garden",
  "Pool",
  "Sea view",
  "Furnished",
  "Equipped kitchen",
  "Washing machine",
  "Dishwasher",
  "Security",
  "Concierge",
] as const;

export type PropertyAmenity = (typeof PROPERTY_AMENITIES)[number];

/** Furnished and parking have their own toggles in the panel. */
export const FILTER_AMENITIES = PROPERTY_AMENITIES.filter(
  (amenity) => amenity !== "Furnished" && amenity !== "Parking",
);

export type FeatureFilter = "furnished" | "petFriendly" | "hasParking";
export const FEATURE_FILTERS: FeatureFilter[] = [
  "furnished",
  "petFriendly",
  "hasParking",
];

/** One-tap filters in the bar above the results, applied straight away. */
export type QuickFilter = FeatureFilter | `amenity:${PropertyAmenity}`;
export const QUICK_FILTERS: QuickFilter[] = [
  "furnished",
  "petFriendly",
  "hasParking",
  "amenity:Sea view",
  "amenity:Pool",
  "amenity:Air conditioning",
];

const quickAmenity = (filter: QuickFilter) =>
  filter.startsWith("amenity:") ? filter.slice("amenity:".length) : null;

const sameText = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function isQuickFilterOn(
  filters: PropertyFilters,
  filter: QuickFilter,
): boolean {
  const amenity = quickAmenity(filter);
  if (amenity) {
    return !!filters.amenities?.some((item) => sameText(item, amenity));
  }
  return !!filters[filter as FeatureFilter];
}

export function toggleQuickFilter(
  filters: PropertyFilters,
  filter: QuickFilter,
): PropertyFilters {
  const amenity = quickAmenity(filter);
  if (!amenity) {
    const key = filter as FeatureFilter;
    return { ...filters, [key]: filters[key] ? undefined : true };
  }
  const current = filters.amenities ?? [];
  const next = isQuickFilterOn(filters, filter)
    ? current.filter((item) => !sameText(item, amenity))
    : [...current, amenity];
  return { ...filters, amenities: next.length ? next : undefined };
}

// ===========================================
// Filters panel: what it owns, how many are set
// ===========================================

/** Filters the panel edits; location, map area and paging stay outside. */
export const PANEL_FILTER_KEYS = [
  "category",
  "types",
  "minPrice",
  "maxPrice",
  "minBedrooms",
  "minBathrooms",
  "amenities",
  "furnished",
  "petFriendly",
  "hasParking",
  "status",
] as const satisfies readonly (keyof PropertyFilters)[];

export type PanelFilters = Pick<
  PropertyFilters,
  (typeof PANEL_FILTER_KEYS)[number]
>;

export function pickPanelFilters(filters: PropertyFilters): PanelFilters {
  const picked: PanelFilters = {};
  for (const key of PANEL_FILTER_KEYS) {
    if (filters[key] !== undefined) {
      (picked as Record<string, unknown>)[key] = filters[key];
    }
  }
  return picked;
}

export function clearPanelFilters(filters: PropertyFilters): PropertyFilters {
  const cleared = { ...filters };
  for (const key of PANEL_FILTER_KEYS) delete cleared[key];
  return cleared;
}

/** The number on the Filters button: one per type and amenity, as Airbnb. */
export function countPanelFilters(filters: PropertyFilters): number {
  return (
    (filters.category ? 1 : 0) +
    (filters.types?.length ?? 0) +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    (filters.minBedrooms ? 1 : 0) +
    (filters.minBathrooms ? 1 : 0) +
    (filters.amenities?.length ?? 0) +
    (filters.furnished ? 1 : 0) +
    (filters.petFriendly ? 1 : 0) +
    (filters.hasParking ? 1 : 0) +
    (filters.status ? 1 : 0)
  );
}

// ===========================================
// Price slider scale
// ===========================================
// Airbnb's PriceSliderFilterItem maps the slider position p (0..1) to
// min + p² (max - min), and back with a square root: most listings are
// cheap, so the cheap end gets most of the track.

export function priceToPosition(price: number, min: number, max: number) {
  if (max <= min) return 0;
  return Math.sqrt(Math.min(1, Math.max(0, (price - min) / (max - min))));
}

export function positionToPrice(position: number, min: number, max: number) {
  return min + position * position * (max - min);
}

/** Rounds to three significant digits of the range: 1,240 not 1,237.4. */
export function roundPrice(price: number, min: number, max: number) {
  const step = 10 ** Math.max(0, Math.floor(Math.log10(max - min || 1)) - 2);
  return Math.round(price / step) * step;
}

/** Handles stay this far apart, as Airbnb's MIN_PRICE_RANGE_GAP (5%). */
export const MIN_PRICE_POSITION_GAP = 0.05;

export const formatAmount = (value: number) =>
  Math.round(value).toLocaleString("en-US");

// ===========================================
// Active filter chips
// ===========================================

export interface FilterChip {
  id: string;
  label: string;
  remove: (filters: PropertyFilters) => PropertyFilters;
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? ""));

export function typeLabel(type: PropertyType, t: Translations): string {
  const labels: Record<PropertyType, string> = {
    apartment: t.properties.typeApartment,
    house: t.properties.typeHouse,
    villa: t.properties.typeVilla,
    studio: t.properties.typeStudio,
    condo: t.properties.typeCondo,
    land: t.properties.typeLand,
  };
  return labels[type];
}

export function categoryLabel(
  category: PropertyCategory,
  t: Translations,
): string {
  return category === "rental"
    ? t.listingSearch.categoryRental
    : category === "sale"
      ? t.listingSearch.categorySale
      : t.listingSearch.categoryManagement;
}

export function statusLabel(status: PropertyStatus, t: Translations): string {
  return status === "available"
    ? t.properties.available
    : status === "rented"
      ? t.properties.rented
      : status === "maintenance"
        ? t.properties.maintenance
        : t.properties.unlisted;
}

export function amenityLabel(amenity: string, t: Translations): string {
  const names = t.listingSearch.amenityNames as Record<string, string>;
  const known = Object.keys(names).find((name) => sameText(name, amenity));
  return known ? names[known] : amenity;
}

export function priceChipLabel(
  filters: Pick<PropertyFilters, "minPrice" | "maxPrice">,
  t: Translations,
  currency = "TND",
): string | null {
  const { minPrice, maxPrice } = filters;
  const min = minPrice !== undefined ? formatAmount(minPrice) : null;
  const max = maxPrice !== undefined ? formatAmount(maxPrice) : null;
  const range =
    min && max
      ? fill(t.listingSearch.chipPriceRange, { min, max })
      : min
        ? fill(t.listingSearch.chipPriceFrom, { min })
        : max
          ? fill(t.listingSearch.chipPriceUpTo, { max })
          : null;
  return range && `${range} ${currency}`;
}

/** Chips for every panel filter that is set, in the panel's order. */
export function activeFilterChips(
  filters: PropertyFilters,
  t: Translations,
): FilterChip[] {
  const chips: FilterChip[] = [];
  const s = t.listingSearch;

  if (filters.category) {
    chips.push({
      id: "category",
      label: categoryLabel(filters.category, t),
      remove: (f) => ({ ...f, category: undefined }),
    });
  }

  const price = priceChipLabel(filters, t);
  if (price) {
    chips.push({
      id: "price",
      label: price,
      remove: (f) => ({ ...f, minPrice: undefined, maxPrice: undefined }),
    });
  }

  if (filters.minBedrooms) {
    chips.push({
      id: "bedrooms",
      label: fill(s.chipBedrooms, { count: filters.minBedrooms }),
      remove: (f) => ({ ...f, minBedrooms: undefined }),
    });
  }

  if (filters.minBathrooms) {
    chips.push({
      id: "bathrooms",
      label: fill(s.chipBathrooms, { count: filters.minBathrooms }),
      remove: (f) => ({ ...f, minBathrooms: undefined }),
    });
  }

  for (const type of filters.types ?? []) {
    chips.push({
      id: `type:${type}`,
      label: typeLabel(type, t),
      remove: (f) => {
        const types = f.types?.filter((item) => item !== type);
        return { ...f, types: types?.length ? types : undefined };
      },
    });
  }

  for (const feature of FEATURE_FILTERS) {
    if (filters[feature]) {
      chips.push({
        id: feature,
        label:
          feature === "furnished"
            ? s.furnished
            : feature === "petFriendly"
              ? s.petFriendly
              : s.parking,
        remove: (f) => ({ ...f, [feature]: undefined }),
      });
    }
  }

  for (const amenity of filters.amenities ?? []) {
    chips.push({
      id: `amenity:${amenity.toLowerCase()}`,
      label: amenityLabel(amenity, t),
      remove: (f) => {
        const amenities = f.amenities?.filter(
          (item) => !sameText(item, amenity),
        );
        return { ...f, amenities: amenities?.length ? amenities : undefined };
      },
    });
  }

  if (filters.status) {
    chips.push({
      id: "status",
      label: statusLabel(filters.status, t),
      remove: (f) => ({ ...f, status: undefined }),
    });
  }

  return chips;
}

// ===========================================
// URL <-> filters
// ===========================================

const parseNumber = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parsePositive = (value: string | null): number | undefined => {
  const parsed = parseNumber(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
};

const parseList = (value: string | null): string[] =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseFlag = (value: string | null) =>
  value === "1" || value === "true" ? true : undefined;

export function filtersFromSearchParams(
  searchParams: URLSearchParams,
): PropertyFilters {
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  // Older links (home page, footer) say type= and bedrooms=; the home page's
  // rooms menu already meant "1+", "2+".
  const types = [
    ...parseList(searchParams.get("types")),
    ...parseList(searchParams.get("type")),
  ].filter((type): type is PropertyType =>
    PROPERTY_TYPES.includes(type as PropertyType),
  );
  const amenities = parseList(searchParams.get("amenities"));

  return {
    page: 1,
    limit: 12,
    category: CATEGORIES.includes(category as PropertyCategory)
      ? (category as PropertyCategory)
      : undefined,
    status: LISTING_STATUSES.includes(status as PropertyStatus)
      ? (status as PropertyStatus)
      : undefined,
    types: types.length ? [...new Set(types)] : undefined,
    minPrice: parsePositive(searchParams.get("minPrice")),
    maxPrice: parsePositive(searchParams.get("maxPrice")),
    minBedrooms:
      parsePositive(searchParams.get("minBedrooms")) ??
      parsePositive(searchParams.get("bedrooms")),
    minBathrooms:
      parsePositive(searchParams.get("minBathrooms")) ??
      parsePositive(searchParams.get("bathrooms")),
    amenities: amenities.length ? amenities : undefined,
    furnished: parseFlag(searchParams.get("furnished")),
    petFriendly: parseFlag(searchParams.get("pets")),
    hasParking: parseFlag(searchParams.get("parking")),
    nearLat: parseNumber(searchParams.get("nearLat")),
    nearLng: parseNumber(searchParams.get("nearLng")),
    radiusKm: parsePositive(searchParams.get("radiusKm")),
    neLat: parseNumber(searchParams.get("neLat")),
    neLng: parseNumber(searchParams.get("neLng")),
    swLat: parseNumber(searchParams.get("swLat")),
    swLng: parseNumber(searchParams.get("swLng")),
    city: searchParams.get("city") || undefined,
    search: searchParams.get("search") || undefined,
  };
}

export function filtersToSearchParams(f: PropertyFilters): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  };

  set("search", f.search);
  set("city", f.city);
  set("category", f.category);
  set("types", f.types?.join(","));
  set("minPrice", f.minPrice);
  set("maxPrice", f.maxPrice);
  set("minBedrooms", f.minBedrooms);
  set("minBathrooms", f.minBathrooms);
  set("amenities", f.amenities?.join(","));
  set("furnished", f.furnished ? 1 : undefined);
  set("pets", f.petFriendly ? 1 : undefined);
  set("parking", f.hasParking ? 1 : undefined);
  set("status", f.status);
  set("nearLat", f.nearLat);
  set("nearLng", f.nearLng);
  set("radiusKm", f.radiusKm);
  if (
    f.neLat !== undefined &&
    f.neLng !== undefined &&
    f.swLat !== undefined &&
    f.swLng !== undefined
  ) {
    set("neLat", f.neLat);
    set("neLng", f.neLng);
    set("swLat", f.swLat);
    set("swLng", f.swLng);
  }
  return params;
}

/** Same search, same page. */
export const sameFilters = (a: PropertyFilters, b: PropertyFilters) =>
  a.page === b.page &&
  a.limit === b.limit &&
  filtersToSearchParams(a).toString() === filtersToSearchParams(b).toString();
