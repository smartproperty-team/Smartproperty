// ===========================================
// Frontend - listings page: price filter and card actions
// ===========================================

import {
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

const getProperties = vi.fn();
const getPropertyShareData = vi.fn();

vi.mock("@/services/property.service", () => ({
  propertyService: {
    getProperties: (...args: unknown[]) => getProperties(...args),
    getPropertyShareData: (...args: unknown[]) => getPropertyShareData(...args),
  },
}));
// Leaflet maps are not what these tests are about.
vi.mock("@/components/properties/PropertyMapView", () => ({
  default: () => null,
}));
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

  it("orders photos by their position when none is primary", async () => {
    renderPage("");
    const card = (
      await screen.findByRole("link", { name: "Marina flat" })
    ).closest("article")!;
    expect(card.querySelector("img")!.getAttribute("src")).toBe("/b.webp");
  });
});
