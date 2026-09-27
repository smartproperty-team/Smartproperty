// ===========================================
// Frontend - Home page behaviour tests
// ===========================================

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Property } from "../../../types/property";

const getProperties = vi.fn();

vi.mock("@/services/property.service", () => ({
  propertyService: {
    getProperties: (...args: unknown[]) => getProperties(...args),
    getBestMatchRecommendations: vi.fn(),
  },
}));

import HomePage from "../HomePage";

const listing = (overrides: Partial<Property>): Property =>
  ({
    id: overrides.title,
    title: "Listing",
    price: 1000,
    currency: "TND",
    status: "available",
    category: "sale",
    address: {
      street: "",
      city: "Tunis",
      state: "",
      zipCode: "",
      country: "Tunisia",
    },
    features: { bedrooms: 2, bathrooms: 1, area: 90 },
    images: [],
    ...overrides,
  }) as Property;

function ListingsRoute() {
  const location = useLocation();
  return <p data-testid="listings-url">{location.search}</p>;
}

const renderHome = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/properties" element={<ListingsRoute />} />
      </Routes>
    </MemoryRouter>,
  );

describe("HomePage", () => {
  beforeEach(() => {
    getProperties.mockReset();
    getProperties.mockResolvedValue({
      properties: [
        listing({ title: "Sea-view flat", category: "rental", price: 1750 }),
        listing({ title: "Family villa", category: "sale", price: 620000 }),
        listing({
          title: "Managed office",
          category: "management",
          price: 5600,
        }),
      ],
    });
  });

  afterEach(cleanup);

  it("has exactly one h1, stating the value proposition", () => {
    renderHome();
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toMatch(/Find your next home in Tunisia/);
  });

  it("labels each listing by what it is offered as, not its status", async () => {
    renderHome();

    const flat = (
      await screen.findByRole("link", { name: "Sea-view flat" })
    ).closest("article")!;
    const villa = screen
      .getByRole("link", { name: "Family villa" })
      .closest("article")!;
    const office = screen
      .getByRole("link", { name: "Managed office" })
      .closest("article")!;

    expect(within(flat).getByText("For Rent")).toBeTruthy();
    expect(within(flat).getByText("/month")).toBeTruthy();
    expect(within(villa).getByText("For Sale")).toBeTruthy();
    expect(within(villa).queryByText("/month")).toBeNull();
    expect(within(office).getByText("Managed")).toBeTruthy();
  });

  it("shows an honest empty state when there are no listings", async () => {
    getProperties.mockResolvedValue({ properties: [] });
    renderHome();
    expect(await screen.findByText(/No listings yet/)).toBeTruthy();
  });

  it("does not show the personalised rentals section to visitors", async () => {
    renderHome();
    await screen.findByRole("link", { name: "Sea-view flat" });
    expect(
      screen.queryByRole("heading", { name: /Available to rent/ }),
    ).toBeNull();
  });

  it("builds the city cards from real listings, with real counts", async () => {
    // No IntersectionObserver: sections count as in view immediately.
    vi.stubGlobal("IntersectionObserver", undefined);
    renderHome();

    // All three mock listings are in Tunis.
    const tunis = await screen.findByRole("link", { name: /^Tunis/ });
    expect(tunis.getAttribute("href")).toBe("/properties?city=Tunis");
    expect(tunis.textContent).toContain("3 listings");
    vi.unstubAllGlobals();
  });

  it("hides the city section when no listing has a city", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    getProperties.mockResolvedValue({ properties: [] });
    renderHome();

    await screen.findByText(/No listings yet/);
    expect(
      screen.queryByRole("heading", { name: "Explore by city" }),
    ).toBeNull();
    vi.unstubAllGlobals();
  });

  it("searches rentals with the parameters the listings page reads", async () => {
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: "Rent" }));
    expect(
      screen.getByRole("button", { name: "Rent" }).getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: "La Marsa" },
    });
    fireEvent.change(screen.getByLabelText("Monthly rent"), {
      target: { value: "1000-2000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search homes" }));

    const params = new URLSearchParams(
      (await screen.findByTestId("listings-url")).textContent ?? "",
    );
    expect(Object.fromEntries(params)).toEqual({
      category: "rental",
      search: "La Marsa",
      minPrice: "1000",
      maxPrice: "2000",
    });
  });

  it("offers prices in TND, on a monthly scale for rent", () => {
    renderHome();
    const budget = screen.getByLabelText("Budget") as HTMLSelectElement;
    expect([...budget.options].map((o) => o.text)).toContain(
      "200,000 – 500,000 TND",
    );

    fireEvent.click(screen.getByRole("button", { name: "Rent" }));
    const rent = screen.getByLabelText("Monthly rent") as HTMLSelectElement;
    expect([...rent.options].map((o) => o.text)).toContain("Up to 1,000 TND");
  });
});
