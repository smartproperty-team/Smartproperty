// ===========================================
// Map-area search rules
// ===========================================

import { describe, expect, it } from "vitest";

import {
  boundsShiftRatio,
  getMapBounds,
  MAP_SEARCH_MIN_SHIFT,
  roundBounds,
  sameBounds,
} from "../mapSearch";

// A flat projection, 1000 px per degree, is enough to check the geometry.
const flat = (lat: number, lng: number) => ({ x: lng * 1000, y: -lat * 1000 });

const view = { neLat: 0.6, neLng: 0.8, swLat: 0, swLng: 0 }; // 1000 px diagonal

describe("boundsShiftRatio", () => {
  it("is the larger corner shift over the previous diagonal", () => {
    const panned = { neLat: 0.6, neLng: 0.85, swLat: 0, swLng: 0.05 };
    expect(boundsShiftRatio(view, panned, flat)).toBeCloseTo(0.05);
  });

  it("stays under the threshold for a small nudge", () => {
    const nudged = { neLat: 0.61, neLng: 0.81, swLat: 0.01, swLng: 0.01 };
    expect(boundsShiftRatio(view, nudged, flat)).toBeLessThan(
      MAP_SEARCH_MIN_SHIFT,
    );
  });

  it("counts a zoom, where only the corners move", () => {
    const zoomedIn = { neLat: 0.45, neLng: 0.6, swLat: 0.15, swLng: 0.2 };
    expect(boundsShiftRatio(view, zoomedIn, flat)).toBeCloseTo(0.25);
  });
});

describe("map bounds helpers", () => {
  it("needs all four edges", () => {
    expect(getMapBounds({ neLat: 1, neLng: 2, swLat: 0 })).toBeUndefined();
    expect(getMapBounds({ neLat: 1, neLng: 2, swLat: 0, swLng: 0 })).toEqual({
      neLat: 1,
      neLng: 2,
      swLat: 0,
      swLng: 0,
    });
  });

  it("rounds to about a metre and compares edge by edge", () => {
    const rounded = roundBounds({
      neLat: 36.8823533355,
      neLng: 10.2983824797,
      swLat: 36.8020709846,
      swLng: 10.2186427202,
    });
    expect(rounded).toEqual({
      neLat: 36.88235,
      neLng: 10.29838,
      swLat: 36.80207,
      swLng: 10.21864,
    });
    expect(sameBounds(rounded, { ...rounded })).toBe(true);
    expect(sameBounds(rounded, { ...rounded, swLng: 10.2 })).toBe(false);
    expect(sameBounds(rounded, undefined)).toBe(false);
  });
});
