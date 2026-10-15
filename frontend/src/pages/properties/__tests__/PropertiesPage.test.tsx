// ===========================================
// Frontend - listings page: price filter and card actions
// ===========================================

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Property } from "../../../types/property";
import type { MapBounds } from "../../../utils/mapSearch";

const getProperties = vi.fn();
const getPropertyShareData = vi.fn();
const mapView = {
  props: {} as Record<string, unknown>,
  mounts: 0,
  // Every render the map saw, to catch a fit to stale pins.
  renders: [] as { fitKey: string; loading: boolean }[],
};

vi.mock("@/services/property.service", () => ({
  propertyService: {
    getProperties: (...args: unknown[]) => getProperties(...args),
    getPropertyShareData: (...args: unknown[]) => getPropertyShareData(...args),
  },
}));
// Leaflet is covered by PropertyMapView's own tests; this stand-in records
// what the page gives the map and lets a test "move" it.
vi.mock("@/components/properties/PropertyMapView", async () => {
  const { useEffect } = await import("react");
  function MapStandIn(props: { onSearchArea: (bounds: MapBounds) => void }) {
    useEffect(() => {
      mapView.props = props;
      const { fitKey, loading } = props as unknown as {
        fitKey: string;
        loading: boolean;
      };
      mapView.renders.push({ fitKey, loading });
    });
    useEffect(() => {
      mapView.mounts += 1;
    }, []);
    return (
      <button
        type="button"
        onClick={() =>
          props.onSearchArea({
            neLat: 36.9,
            neLng: 10.4,
            swLat: 36.8,
            swLng: 10.2,
          })
        }
      >
        Move map
      </button>
    );
  }
  return { default: MapStandIn };
});
vi.mock("@/components/settings/LocationPreferenceMap", () => ({
  default: () => null,
}));

import PropertiesPage from "../PropertiesPage";

const listing = (id: string, title: string, price: number): Property =>
  ({
    id,
    title,
    price,
    currency: "TND",
    status: "available",
    category: "rental",
    type: "apartment",
    address: {
      street: "",
      city: "Sousse",
      state: "",
      zipCode: "",
      country: "Tunisia",
    },
    features: { bedrooms: 2, bathrooms: 1, area: 80 },
    images: [
      { url: "/a.webp", isPrimary: false, order: 2 },
      { url: "/b.webp", isPrimary: false, order: 1 },
    ],
  }) as Property;

function Url() {
  return <p data-testid="url">{useLocation().search}</p>;
}

const renderPage = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/properties${search}`]}>
      <Routes>
        <Route
          path="/properties"
          element={
            <>
              <PropertiesPage />
              <Url />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("PropertiesPage", () => {
  beforeEach(() => {
    getProperties.mockReset();
    getProperties.mockResolvedValue({
      properties: [
        listing("p1", "Marina flat", 1750),
        listing("p2", "Old town studio", 1200),
      ],
      total: 2,
    });
  });

  afterEach(cleanup);

  it("shows and applies a price range that came in the URL", async () => {
    renderPage("?category=rental&minPrice=1000&maxPrice=2000");

    // The filter panel opens by itself, with the range filled in.
    expect(
      (screen.getByLabelText("Min price (TND)") as HTMLInputElement).value,
    ).toBe("1000");
    expect(
      (screen.getByLabelText("Max price (TND)") as HTMLInputElement).value,
    ).toBe("2000");

    await waitFor(() =>
      expect(getProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "rental",
          minPrice: 1000,
          maxPrice: 2000,
        }),
      ),
    );
  });

  it("searches with an edited price range and keeps it in the URL", async () => {
    renderPage("?minPrice=1000&maxPrice=2000");

    fireEvent.change(screen.getByLabelText("Max price (TND)"), {
      target: { value: "1500" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Search" })[0]);

    await waitFor(() =>
      expect(screen.getByTestId("url").textContent).toContain("maxPrice=1500"),
    );
    expect(screen.getByTestId("url").textContent).toContain("minPrice=1000");
  });

  it("renders each result as a listing card with compare and share", async () => {
    renderPage("");
    const card = (
      await screen.findByRole("link", { name: "Marina flat" })
    ).closest("article")!;

    const compare = within(card).getByRole("button", {
      name: "Add to compare",
    });
    fireEvent.click(compare);

    expect(
      within(card)
        .getByRole("button", { name: "Remove from compare" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(within(card).getByRole("button", { name: "Share" })).toBeTruthy();
  });

  it("clears the price range with the other filters", async () => {
    renderPage("?minPrice=1000&maxPrice=2000");

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(
      (screen.getByLabelText("Min price (TND)") as HTMLInputElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText("Max price (TND)") as HTMLInputElement).value,
    ).toBe("");
    await waitFor(() =>
      expect(screen.getByTestId("url").textContent).not.toContain("Price"),
    );
  });

  it("highlights a card while the pointer is over it", async () => {
    renderPage("");
    const card = (
      await screen.findByRole("link", { name: "Marina flat" })
    ).closest("article")!;

    fireEvent.mouseEnter(card);
    expect(card.classList.contains("listing-card--highlighted")).toBe(true);
    fireEvent.mouseLeave(card);
    expect(card.classList.contains("listing-card--highlighted")).toBe(false);
  });

  it.each([
    ["next to the map", false],
    ["in the grid without the map", true],
  ])("copies a listing's share link %s", async (_where, hideMap) => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    getPropertyShareData.mockResolvedValue({
      shareUrl: "https://smartproperties.tech/properties/p2",
    });
    renderPage("");
    await screen.findByRole("link", { name: "Old town studio" });
    if (hideMap) {
      fireEvent.click(screen.getByRole("button", { name: /Hide map/ }));
    }

    const card = screen
      .getByRole("link", { name: "Old town studio" })
      .closest("article")!;
    fireEvent.click(within(card).getByRole("button", { name: "Share" }));

    expect(await screen.findByText("Property link copied.")).toBeTruthy();
    expect(getPropertyShareData).toHaveBeenCalledWith("p2");
    expect(writeText).toHaveBeenCalledWith(
      "https://smartproperties.tech/properties/p2",
    );

    fireEvent.click(
      within(card).getByRole("button", { name: "Add to compare" }),
    );
    expect(
      within(card).getByRole("button", { name: "Remove from compare" }),
    ).toBeTruthy();
  });

  it("asks for at least the bedrooms the home page's menu offered", async () => {
    renderPage("?bedrooms=2");

    await waitFor(() =>
      expect(getProperties).toHaveBeenCalledWith(
        expect.objectContaining({ minBedrooms: 2, bedrooms: undefined }),
      ),
    );
  });

  it("orders photos by their position when none is primary", async () => {
    renderPage("");
    const card = (
      await screen.findByRole("link", { name: "Marina flat" })
    ).closest("article")!;
    expect(card.querySelector("img")!.getAttribute("src")).toBe("/b.webp");
  });

  describe("map area search", () => {
    const area = "neLat=36.9&neLng=10.4&swLat=36.8&swLng=10.2";

    beforeEach(() => {
      mapView.mounts = 0;
    });

    it("searches the visible area from page 1 when the map moves", async () => {
      renderPage("?type=apartment");
      await screen.findByRole("link", { name: "Marina flat" });

      fireEvent.click(screen.getByRole("button", { name: "Move map" }));

      await waitFor(() =>
        expect(getProperties).toHaveBeenLastCalledWith(
          expect.objectContaining({
            type: "apartment",
            neLat: 36.9,
            neLng: 10.4,
            swLat: 36.8,
            swLng: 10.2,
            page: 1,
            includeMapPins: true,
          }),
        ),
      );
      expect(screen.getByTestId("url").textContent).toContain(area);
      expect(screen.getByText(/within map area/)).toBeTruthy();
    });

    it("restores a shared map area and can clear it", async () => {
      renderPage(`?${area}`);
      await screen.findByRole("link", { name: "Marina flat" });

      expect(mapView.props.searchBounds).toEqual({
        neLat: 36.9,
        neLng: 10.4,
        swLat: 36.8,
        swLng: 10.2,
      });

      fireEvent.click(screen.getByRole("button", { name: "Clear map area" }));

      await waitFor(() =>
        expect(screen.getByTestId("url").textContent).not.toContain("neLat"),
      );
      expect(mapView.props.searchBounds).toBeUndefined();
    });

    it("drops the map area when the user searches another city", async () => {
      renderPage(`?${area}`);
      await screen.findByRole("link", { name: "Marina flat" });

      fireEvent.click(screen.getByRole("button", { name: "Filters" }));
      fireEvent.change(screen.getByLabelText("City"), {
        target: { value: "Sousse" },
      });
      fireEvent.click(screen.getAllByRole("button", { name: "Search" })[0]);

      await waitFor(() =>
        expect(screen.getByTestId("url").textContent).toContain("city=Sousse"),
      );
      expect(screen.getByTestId("url").textContent).not.toContain("neLat");
    });

    it("gives the map pins for every match", async () => {
      const pins = [
        {
          id: "p9",
          title: "Far flat",
          type: "apartment",
          status: "available",
          price: 900,
          currency: "TND",
          city: "Sousse",
          lat: 35.8,
          lng: 10.6,
        },
      ];
      getProperties.mockResolvedValue({
        properties: [listing("p1", "Marina flat", 1750)],
        total: 13,
        mapPins: pins,
      });
      renderPage("");
      await screen.findByRole("link", { name: "Marina flat" });

      expect(mapView.props.mapPins).toEqual(pins);
    });

    it("tells the map its pins are stale until the new search answers", async () => {
      renderPage("");
      await screen.findByRole("link", { name: "Marina flat" });
      let answer!: (value: unknown) => void;
      getProperties.mockReturnValueOnce(
        new Promise((resolve) => (answer = resolve)),
      );
      const before = mapView.renders.length;

      fireEvent.click(screen.getByRole("button", { name: "Move map" }));
      await waitFor(() => expect(getProperties).toHaveBeenCalledTimes(2));
      const newKey = mapView.renders[mapView.renders.length - 1].fitKey;
      const whileLoading = mapView.renders
        .slice(before)
        .filter((render) => render.fitKey === newKey);
      expect(whileLoading.length).toBeGreaterThan(0);
      // Not one render with the new search and the old pins claims ready.
      expect(whileLoading.every((render) => render.loading)).toBe(true);

      await act(async () => {
        answer({ properties: [listing("p5", "Area flat", 900)], total: 1 });
      });
      await waitFor(() => expect(mapView.props.loading).toBe(false));
    });

    it("keeps the list and the map on screen while the next search loads", async () => {
      renderPage("");
      await screen.findByRole("link", { name: "Marina flat" });
      getProperties.mockReturnValue(new Promise(() => {}));

      fireEvent.click(screen.getByRole("button", { name: "Move map" }));

      await waitFor(() => expect(mapView.props.loading).toBe(true));
      expect(screen.getByRole("link", { name: "Marina flat" })).toBeTruthy();
      expect(mapView.mounts).toBe(1);
    });

    it("shows the newest search when an older one answers last", async () => {
      renderPage("");
      await screen.findByRole("link", { name: "Marina flat" });

      let answerOlder!: (value: unknown) => void;
      getProperties.mockReturnValueOnce(
        new Promise((resolve) => (answerOlder = resolve)),
      );
      fireEvent.click(screen.getByRole("button", { name: "Move map" }));
      await waitFor(() => expect(getProperties).toHaveBeenCalledTimes(2));

      getProperties.mockResolvedValueOnce({
        properties: [listing("p3", "Newest result", 1300)],
        total: 1,
      });
      fireEvent.click(screen.getByRole("button", { name: "Clear map area" }));
      await screen.findByRole("link", { name: "Newest result" });

      answerOlder({
        properties: [listing("p4", "Stale result", 1100)],
        total: 1,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(screen.queryByRole("link", { name: "Stale result" })).toBeNull();
      expect(screen.getByRole("link", { name: "Newest result" })).toBeTruthy();
    });

    it("explains an empty map area and offers to clear it", async () => {
      getProperties.mockResolvedValue({ properties: [], total: 0 });
      renderPage(`?${area}`);

      expect(
        await screen.findByText(
          "No properties in this map area. Try zooming out or moving the map.",
        ),
      ).toBeTruthy();
      // Still there, so the user can move somewhere else.
      expect(screen.getByRole("button", { name: "Move map" })).toBeTruthy();
      expect(
        screen.getAllByRole("button", { name: "Clear map area" }),
      ).toHaveLength(2);
    });
  });
});
