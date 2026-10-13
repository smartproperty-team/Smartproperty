// ===========================================
// Map-area search rules
// ===========================================
// Mirrors how Airbnb's search map decides to search again after the user
// moves it (StaysMap bundle, read on airbnb.com in October 2026):
// it waits for the map to settle, ignores small nudges, and debounces.

import type { PropertyFilters } from "@/types/property";

export interface MapBounds {
  neLat: number;
  neLng: number;
  swLat: number;
  swLng: number;
}

/** Wait after the map settles; Airbnb's desktop default is 300 ms. */
export const MAP_SEARCH_DEBOUNCE_MS = 300;

/** Ignore moves under 3% of the view, like Airbnb's geoDebouncingThreshold. */
export const MAP_SEARCH_MIN_SHIFT = 0.03;

/** Keep pins off the very edge, like Airbnb's 16 px explore-map padding. */
export const MAP_SEARCH_PADDING_PX = 16;

type Point = { x: number; y: number };
type Project = (lat: number, lng: number) => Point;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * How far the view moved, as a share of the previous view's diagonal:
 * the larger of the two corner shifts, both measured in screen pixels.
 */
export function boundsShiftRatio(
  previous: MapBounds,
  next: MapBounds,
  project: Project,
): number {
  const previousNe = project(previous.neLat, previous.neLng);
  const previousSw = project(previous.swLat, previous.swLng);
  const diagonal = distance(previousNe, previousSw);
  if (diagonal === 0) return Number.POSITIVE_INFINITY;

  const neShift = distance(previousNe, project(next.neLat, next.neLng));
  const swShift = distance(previousSw, project(next.swLat, next.swLng));
  return Math.max(neShift, swShift) / diagonal;
}

/** About a metre of precision, which keeps shared URLs short. */
export const roundCoordinate = (value: number) =>
  Math.round(value * 1e5) / 1e5;

export const roundBounds = (bounds: MapBounds): MapBounds => ({
  neLat: roundCoordinate(bounds.neLat),
  neLng: roundCoordinate(bounds.neLng),
  swLat: roundCoordinate(bounds.swLat),
  swLng: roundCoordinate(bounds.swLng),
});

export const sameBounds = (left?: MapBounds, right?: MapBounds) =>
  !!left &&
  !!right &&
  left.neLat === right.neLat &&
  left.neLng === right.neLng &&
  left.swLat === right.swLat &&
  left.swLng === right.swLng;

/** The map area a search is limited to, when all four edges are set. */
export function getMapBounds(filters: PropertyFilters): MapBounds | undefined {
  const { neLat, neLng, swLat, swLng } = filters;
  return neLat !== undefined &&
    neLng !== undefined &&
    swLat !== undefined &&
    swLng !== undefined
    ? { neLat, neLng, swLat, swLng }
    : undefined;
}
