// ===========================================
// Listing filters: URL, chips, counts, price scale
// ===========================================

import { describe, expect, it } from "vitest";

import { en } from "../../i18n/translations/en";
import {
  activeFilterChips,
  clearPanelFilters,
  countPanelFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  isQuickFilterOn,
  positionToPrice,
  priceToPosition,
  roundPrice,
  sameFilters,
  toggleQuickFilter,
} from "../listingFilters";

const fromUrl = (query: string) =>
  filtersFromSearchParams(new URLSearchParams(query));

describe("filters in the URL", () => {
  it("round-trips every filter", () => {
    const query =
      "search=sea&city=Sousse&category=rental&types=villa%2Chouse" +
      "&minPrice=1000&maxPrice=2500&minBedrooms=2&minBathrooms=1" +
      "&amenities=Pool%2CSea+view&furnished=1&pets=1&parking=1" +
      "&status=available";

    const filters = fromUrl(query);

    expect(filters).toMatchObject({
      search: "sea",
      city: "Sousse",
      category: "rental",
      types: ["villa", "house"],
      minPrice: 1000,
      maxPrice: 2500,
      minBedrooms: 2,
      minBathrooms: 1,
      amenities: ["Pool", "Sea view"],
      furnished: true,
      petFriendly: true,
      hasParking: true,
      status: "available",
    });
    expect(filtersToSearchParams(filters).toString()).toBe(query);
  });

  it("reads older links as the new filters", () => {
    expect(fromUrl("type=villa&bedrooms=3&bathrooms=2")).toMatchObject({
      types: ["villa"],
      minBedrooms: 3,
      minBathrooms: 2,
    });
  });

  it("drops values it does not know", () => {
    expect(
      fromUrl("types=castle,villa&category=lease&status=gone&minPrice=-5"),
    ).toMatchObject({
      types: ["villa"],
      category: undefined,
      status: undefined,
      minPrice: undefined,
    });
  });

  it("compares searches by what they ask for", () => {
    expect(sameFilters(fromUrl("types=villa"), fromUrl("type=villa"))).toBe(
      true,
    );
    expect(sameFilters(fromUrl("pets=1"), fromUrl(""))).toBe(false);
  });
});

describe("filter bar", () => {
  it("counts one per type and amenity, as Airbnb's badge", () => {
    expect(
      countPanelFilters(
        fromUrl("types=villa,house&amenities=Pool&minPrice=10&maxPrice=90"),
      ),
    ).toBe(4);
    // The place to look is not counted.
    expect(countPanelFilters(fromUrl("search=sea&city=Tunis"))).toBe(0);
  });

  it("makes a chip per filter, each removing only itself", () => {
    const filters = fromUrl(
      "category=sale&minPrice=100000&types=villa,house&amenities=Pool&pets=1",
    );
    const chips = activeFilterChips(filters, en);

    expect(chips.map((chip) => chip.label)).toEqual([
      "Buy",
      "100,000+ TND",
      "Villa",
      "House",
      "Pet friendly",
      "Pool",
    ]);
    const villa = chips.find((chip) => chip.label === "Villa")!;
    expect(villa.remove(filters).types).toEqual(["house"]);
    const pool = chips.find((chip) => chip.label === "Pool")!;
    expect(pool.remove(filters).amenities).toBeUndefined();
  });

  it("labels price ranges by which ends are set", () => {
    const label = (query: string) =>
      activeFilterChips(fromUrl(query), en).find((c) => c.id === "price")
        ?.label;

    expect(label("minPrice=1000&maxPrice=2500")).toBe("1,000–2,500 TND");
    expect(label("maxPrice=2500")).toBe("Up to 2,500 TND");
  });

  it("toggles quick filters, matching amenities whatever their case", () => {
    const filters = fromUrl("amenities=sea view");

    expect(isQuickFilterOn(filters, "amenity:Sea view")).toBe(true);
    expect(toggleQuickFilter(filters, "amenity:Sea view").amenities).toBe(
      undefined,
    );
    expect(toggleQuickFilter(filters, "hasParking").hasParking).toBe(true);
  });

  it("clears the panel's filters but keeps the place and map area", () => {
    const cleared = clearPanelFilters(
      fromUrl("search=sea&pets=1&neLat=1&neLng=2&swLat=0&swLng=1"),
    );

    expect(cleared.petFriendly).toBeUndefined();
    expect(cleared.search).toBe("sea");
    expect(cleared.neLat).toBe(1);
  });
});

describe("price slider scale", () => {
  it("gives the cheap end more of the track, as a square root", () => {
    // A quarter of the price range is half way along the slider.
    expect(priceToPosition(250, 0, 1000)).toBeCloseTo(0.5);
    expect(positionToPrice(0.5, 0, 1000)).toBeCloseTo(250);
  });

  it("goes back and forth without drifting, and clamps", () => {
    const position = priceToPosition(1234, 500, 9000);
    expect(positionToPrice(position, 500, 9000)).toBeCloseTo(1234);
    expect(priceToPosition(50, 500, 9000)).toBe(0);
    expect(priceToPosition(99999, 500, 9000)).toBe(1);
  });

  it("rounds to a step that suits the range", () => {
    expect(roundPrice(1237.4, 500, 3000)).toBe(1240);
    expect(roundPrice(423456, 100000, 900000)).toBe(423000);
  });
});
