// ===========================================
// Frontend - shared listing card
// ===========================================

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Property } from "../../../types/property";
import { ListingCard, type ListingCardProps } from "../ListingCard";

const property = (overrides: Partial<Property> = {}): Property =>
  ({
    id: "p1",
    title: "Sea-view flat",
    price: 1750,
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
    features: { bedrooms: 2, bathrooms: 1, area: 90 },
    images: [
      { url: "/second.webp", isPrimary: false, order: 2 },
      { url: "/primary.webp", isPrimary: true, order: 1 },
    ],
    ...overrides,
  }) as Property;

const renderCard = (props: Partial<ListingCardProps> = {}) =>
  render(
    <MemoryRouter>
      <ListingCard property={property()} {...props} />
    </MemoryRouter>,
  );

const photo = () => screen.getByRole("article").querySelector("img")!;

describe("ListingCard", () => {
  afterEach(cleanup);

  it("is one link to the listing, named by its title", () => {
    renderCard();
    const link = screen.getByRole("link", { name: "Sea-view flat" });
    expect(link.getAttribute("href")).toBe("/properties/p1");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("shows the primary photo first, the offer and the details", () => {
    renderCard();
    expect(photo().getAttribute("src")).toBe("/primary.webp");
    const card = screen.getByRole("article");
    expect(within(card).getByText("For Rent")).toBeTruthy();
    expect(within(card).getByText("/month")).toBeTruthy();
    expect(within(card).getByText("Apartment")).toBeTruthy();
    expect(within(card).getByText("90 m²")).toBeTruthy();
  });

  it("steps through photos with the gallery dots", () => {
    renderCard({ gallery: true });
    const dots = screen.getAllByRole("button", { name: /photo \d of 2/ });
    expect(dots).toHaveLength(2);
    expect(dots[0].getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(dots[1]);

    expect(photo().getAttribute("src")).toBe("/second.webp");
    expect(dots[1].getAttribute("aria-pressed")).toBe("true");
  });

  it("has no dots without the gallery option", () => {
    renderCard();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the status only when a listing is unavailable, unless asked", () => {
    renderCard();
    expect(screen.queryByText("Available")).toBeNull();
    cleanup();

    renderCard({ showStatus: "always" });
    expect(screen.getByText("Available")).toBeTruthy();
    cleanup();

    render(
      <MemoryRouter>
        <ListingCard property={property({ status: "rented" })} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Rented")).toBeTruthy();
  });

  it("renders page actions that stay clickable", () => {
    const onRemove = vi.fn();
    renderCard({
      actions: (
        <button type="button" onClick={onRemove}>
          Remove
        </button>
      ),
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("can be highlighted and reports hover", () => {
    const onMouseEnter = vi.fn();
    renderCard({ highlighted: true, onMouseEnter });
    const card = screen.getByRole("article");
    expect(card.className).toContain("listing-card--highlighted");
    fireEvent.mouseEnter(card);
    expect(onMouseEnter).toHaveBeenCalled();
  });

  it("swaps a photo that fails to load for the placeholder, once", () => {
    renderCard();
    fireEvent.error(photo());
    expect(photo().getAttribute("src")).toBe("/placeholder-property.svg");
    // A failing placeholder must not loop.
    fireEvent.error(photo());
    expect(photo().getAttribute("src")).toBe("/placeholder-property.svg");
  });

  it("copes with a listing that has no address or features", () => {
    render(
      <MemoryRouter>
        <ListingCard
          property={property({
            address: undefined as never,
            features: undefined,
            type: "villa",
          })}
        />
      </MemoryRouter>,
    );
    const card = screen.getByRole("article");
    expect(within(card).getByText("Villa")).toBeTruthy();
    expect(card.querySelector(".listing-place")).toBeNull();
  });
  it("falls back to a placeholder when there is no photo", () => {
    render(
      <MemoryRouter>
        <ListingCard property={property({ images: [] })} />
      </MemoryRouter>,
    );
    expect(photo().getAttribute("src")).toBe("/placeholder-property.svg");
  });
});
