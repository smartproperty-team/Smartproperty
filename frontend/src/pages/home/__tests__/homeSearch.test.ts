// ===========================================
// Frontend - home page listing helper tests
// ===========================================

import { describe, expect, it } from "vitest";

import { listingBadge, topCities } from "../homeSearch";
import type { Property } from "../../../types/property";

describe("listingBadge", () => {
  it("follows the listing category, not its status", () => {
    expect(listingBadge("rental")).toBe("rent");
    expect(listingBadge("sale")).toBe("sale");
    expect(listingBadge("management")).toBe("managed");
    expect(listingBadge(undefined)).toBe("sale");
  });
});

describe("topCities", () => {
  const inCity = (city: string) => ({ address: { city } }) as Property;
  const listings = [
    inCity("Sousse"),
    inCity("Tunis"),
    inCity(" sousse "),
    inCity(""),
    inCity("Nabeul"),
    inCity("Tunis"),
    inCity("Sousse"),
  ];

  it("counts listings per city, busiest first, ignoring case and spacing", () => {
    expect(topCities(listings, listings.length)).toEqual([
      { name: "Sousse", count: 3 },
      { name: "Tunis", count: 2 },
      { name: "Nabeul", count: 1 },
    ]);
  });

  it("drops the counts when only part of the listings was fetched", () => {
    expect(topCities(listings, 500)).toEqual([
      { name: "Sousse" },
      { name: "Tunis" },
      { name: "Nabeul" },
    ]);
  });

  it("caps the number of cities", () => {
    expect(topCities(listings, listings.length, 2)).toHaveLength(2);
  });
});
