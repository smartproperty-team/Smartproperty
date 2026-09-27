// ===========================================
// Frontend - home search helper tests
// ===========================================

import { describe, expect, it } from "vitest";

import {
  PRICE_BANDS,
  buildHomeSearchParams,
  formatPriceBand,
  listingBadge,
  topCities,
} from "../homeSearch";
import type { Property } from "../../../types/property";

const search = (overrides = {}) =>
  Object.fromEntries(
    buildHomeSearchParams({
      mode: "sale",
      location: "",
      type: "",
      rooms: "",
      price: "",
      ...overrides,
    }),
  );

describe("buildHomeSearchParams", () => {
  it("maps Buy and Rent to the category the listings page filters on", () => {
    expect(search({ mode: "sale" })).toEqual({ category: "sale" });
    expect(search({ mode: "rent" })).toEqual({ category: "rental" });
  });

  it("passes location, type and rooms through, trimming the location", () => {
    expect(
      search({ location: "  La Marsa ", type: "villa", rooms: "3" }),
    ).toEqual({
      category: "sale",
      search: "La Marsa",
      type: "villa",
      bedrooms: "3",
    });
  });

  it("turns a price band into minPrice and maxPrice", () => {
    expect(search({ mode: "rent", price: "1000-2000" })).toMatchObject({
      minPrice: "1000",
      maxPrice: "2000",
    });
    expect(search({ price: "0-200000" })).toMatchObject({ maxPrice: "200000" });
    expect(search({ price: "0-200000" })).not.toHaveProperty("minPrice");
    expect(search({ price: "1000000+" })).toMatchObject({
      minPrice: "1000000",
    });
    expect(search({ price: "1000000+" })).not.toHaveProperty("maxPrice");
  });

  it("ignores a band from the other mode", () => {
    // A rent band left selected after switching to Buy must not leak through.
    expect(search({ mode: "sale", price: "1000-2000" })).toEqual({
      category: "sale",
    });
  });
});

describe("formatPriceBand", () => {
  const labels = { upTo: "Up to", currency: "TND" };

  it("labels every band in TND", () => {
    expect(PRICE_BANDS.rent.map((b) => formatPriceBand(b, labels))).toEqual([
      "Up to 1,000 TND",
      "1,000 – 2,000 TND",
      "2,000 – 5,000 TND",
      "5,000+ TND",
    ]);
    expect(formatPriceBand(PRICE_BANDS.sale[1], labels)).toBe(
      "200,000 – 500,000 TND",
    );
  });
});

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
