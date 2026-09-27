// ===========================================
// Frontend - address geocoding tests
// ===========================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Property } from "../../types/property";
import { geocodeAddress, nominatimSearch } from "../geocode";

const address = {
  street: "12 Rue de Marseille",
  city: "Tunis",
  state: "Tunis",
  zipCode: "1000",
  country: "Tunisia",
} as Property["address"];

const hit = (lat: string, lon: string) => [{ lat, lon, display_name: "x" }];

describe("geocoding", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  // Responds to each call in turn: a match array, [] for no match, or an Error.
  const respond = (...responses: Array<unknown[] | Error>) => {
    for (const r of responses) {
      if (r instanceof Error) fetchMock.mockRejectedValueOnce(r);
      else fetchMock.mockResolvedValueOnce({ json: async () => r });
    }
  };
  const queryOf = (call: number) =>
    decodeURIComponent(String(fetchMock.mock.calls[call][0]).split("&q=")[1]);

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the full address when it matches, at street zoom", async () => {
    respond(hit("36.8", "10.18"));

    expect(await geocodeAddress(address)).toEqual({
      lat: 36.8,
      lng: 10.18,
      zoom: 17,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queryOf(0)).toBe("12 Rue de Marseille, Tunis, Tunis, 1000, Tunisia");
  });

  it("falls back to street + city + country", async () => {
    respond([], hit("36.7", "10.1"));

    expect(await geocodeAddress(address)).toEqual({
      lat: 36.7,
      lng: 10.1,
      zoom: 16,
    });
    expect(queryOf(1)).toBe("12 Rue de Marseille, Tunis, Tunisia");
  });

  it("falls back to the city, zoomed out", async () => {
    respond([], [], hit("36.8", "10.2"));

    expect(await geocodeAddress(address)).toEqual({
      lat: 36.8,
      lng: 10.2,
      zoom: 13,
    });
    expect(queryOf(2)).toBe("Tunis, Tunis, Tunisia");
  });

  it("returns null when nothing matches", async () => {
    respond([], [], []);

    expect(await geocodeAddress(address)).toBeNull();
  });

  it("treats a network error as no match", async () => {
    respond(new Error("offline"));

    expect(await nominatimSearch("anywhere")).toBeNull();
  });

  it("skips empty address parts", async () => {
    respond(hit("1", "2"));

    await geocodeAddress({ ...address, state: "", zipCode: "" });
    expect(queryOf(0)).toBe("12 Rue de Marseille, Tunis, Tunisia");
  });
});
