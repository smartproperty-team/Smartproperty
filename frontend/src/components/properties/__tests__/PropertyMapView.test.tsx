// ===========================================
// PropertyMapView - search as the map moves, pins and preview card
// ===========================================

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import L from "leaflet";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Property, PropertyMapPin } from "../../../types/property";
import PropertyMapView from "../PropertyMapView";

// happy-dom has no layout: give every map a fixed 800x600 viewport and keep
// a handle on it so the tests can move it like a user would.
const maps: L.Map[] = [];
L.Map.addInitHook(function (this: L.Map) {
  this.getSize = () => L.point(800, 600);
  maps.push(this);
});
const currentMap = () => maps[maps.length - 1];

const property = (id: string, lat: number, lng: number): Property =>
  ({
    id,
    title: `Flat ${id}`,
    price: 1750,
    currency: "TND",
    status: "available",
    category: "rental",
    type: "apartment",
    address: {
      street: "",
      city: "Tunis",
      state: "",
      zipCode: "",
      country: "Tunisia",
      coordinates: { lat, lng },
    },
    features: { bedrooms: 2, area: 80 },
    images: [] as Property["images"],
  }) as Property;

const pin = (id: string, lat: number, lng: number): PropertyMapPin => ({
  id,
  title: `Flat ${id}`,
  type: "apartment",
  status: "available",
  price: 900,
  currency: "TND",
  city: "Tunis",
  lat,
  lng,
});

const renderMap = (props: Partial<Parameters<typeof PropertyMapView>[0]>) =>
  render(
    <MemoryRouter>
      <PropertyMapView properties={[]} {...props} />
    </MemoryRouter>,
  );

describe("PropertyMapView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("searches the visible area once the map settles after a user move", () => {
    const onSearchArea = vi.fn();
    renderMap({ onSearchArea });

    act(() => {
      currentMap().panBy([300, 0], { animate: false });
    });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(onSearchArea).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onSearchArea).toHaveBeenCalledTimes(1);
    const bounds = onSearchArea.mock.calls[0][0];
    expect(bounds.neLat).toBeGreaterThan(bounds.swLat);
    expect(bounds.neLng).toBeGreaterThan(bounds.swLng);
  });

  it("waits for the last of several quick moves", () => {
    const onSearchArea = vi.fn();
    renderMap({ onSearchArea });

    act(() => {
      currentMap().panBy([200, 0], { animate: false });
      vi.advanceTimersByTime(150);
      currentMap().panBy([200, 0], { animate: false });
      vi.advanceTimersByTime(300);
    });

    expect(onSearchArea).toHaveBeenCalledTimes(1);
  });

  it("ignores a nudge smaller than 3% of the view", () => {
    const onSearchArea = vi.fn();
    renderMap({ onSearchArea });

    act(() => {
      currentMap().panBy([300, 0], { animate: false });
      vi.advanceTimersByTime(300);
    });
    act(() => {
      currentMap().panBy([10, 0], { animate: false });
      vi.advanceTimersByTime(300);
    });

    expect(onSearchArea).toHaveBeenCalledTimes(1);
  });

  it("does not search when it fits the map itself", () => {
    const onSearchArea = vi.fn();
    const { rerender } = renderMap({ onSearchArea, loading: true });

    rerender(
      <MemoryRouter>
        <PropertyMapView
          properties={[property("a", 36.8, 10.1), property("b", 36.9, 10.3)]}
          onSearchArea={onSearchArea}
          fitKey="city=Tunis"
        />
      </MemoryRouter>,
    );
    rerender(
      <MemoryRouter>
        <PropertyMapView
          properties={[]}
          onSearchArea={onSearchArea}
          searchBounds={{ neLat: 37, neLng: 10.5, swLat: 36.5, swLng: 9.9 }}
        />
      </MemoryRouter>,
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSearchArea).not.toHaveBeenCalled();
  });

  it("does not search when the window is resized", () => {
    const onSearchArea = vi.fn();
    renderMap({ onSearchArea });

    // Leaflet's own sequence for a window resize: move, resize, then a
    // debounced moveend.
    act(() => {
      currentMap().fire("move").fire("resize").fire("moveend");
      vi.advanceTimersByTime(1000);
    });
    expect(onSearchArea).not.toHaveBeenCalled();

    // The next real move still searches.
    act(() => {
      currentMap().panBy([300, 0], { animate: false });
      vi.advanceTimersByTime(300);
    });
    expect(onSearchArea).toHaveBeenCalledTimes(1);
  });

  it("offers 'Search this area' instead when auto-search is off", () => {
    const onSearchArea = vi.fn();
    renderMap({ onSearchArea });

    fireEvent.click(screen.getByLabelText("Search as I move the map"));
    act(() => {
      currentMap().panBy([300, 0], { animate: false });
      vi.advanceTimersByTime(1000);
    });
    expect(onSearchArea).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Search this area" }));
    expect(onSearchArea).toHaveBeenCalledTimes(1);
  });

  it("draws price pills for the page and dots for other matches", () => {
    const { container } = renderMap({
      properties: [property("a", 36.8, 10.1)],
      mapPins: [pin("a", 36.8, 10.1), pin("b", 36.85, 10.2)],
    });

    expect(container.querySelectorAll(".property-price-marker")).toHaveLength(1);
    expect(container.querySelectorAll(".property-mini-marker")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Flat b, 900 TND" }),
    ).toBeTruthy();
  });

  it("opens a preview card for a pin and closes it again", () => {
    renderMap({ mapPins: [pin("b", 36.8065, 10.1815)] });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Flat b, 900 TND" }));
    });
    expect(screen.getByRole("link", { name: /Flat b/ })).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Flat b, 900 TND" })
        .querySelector(".property-mini-marker.selected"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    expect(screen.queryByRole("link", { name: /Flat b/ })).toBeNull();
  });
});
