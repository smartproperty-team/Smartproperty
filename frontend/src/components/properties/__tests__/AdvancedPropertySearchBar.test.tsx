// ===========================================
// Frontend - listings filter bar: price range
// ===========================================

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AdvancedPropertySearchBar from "../AdvancedPropertySearchBar";

const labels = {
  searchPlaceholder: "Search",
  filters: "Filters",
  search: "Search",
  type: "Type",
  status: "Status",
  city: "City",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  nearby: "Nearby",
  nearbyTrigger: "Pick on map",
  nearbyPlaceholder: "",
  any: "Any",
  allTypes: "All types",
  allStatuses: "All statuses",
  available: "Available",
  rented: "Rented",
  maintenance: "Maintenance",
  unlisted: "Unlisted",
  typeApartment: "Apartment",
  typeHouse: "House",
  typeVilla: "Villa",
  typeStudio: "Studio",
  typeCondo: "Condo",
  typeLand: "Land",
  reset: "Reset",
  clearNearby: "Clear",
  minPrice: "Min price (TND)",
  maxPrice: "Max price (TND)",
};

const noop = () => {};

const renderBar = (overrides = {}) =>
  render(
    <AdvancedPropertySearchBar
      searchQuery=""
      onSearchQueryChange={noop}
      cityValue=""
      onCityChange={noop}
      onTypeChange={noop}
      onStatusChange={noop}
      bedroomsValue=""
      onBedroomsChange={noop}
      bathroomsValue=""
      onBathroomsChange={noop}
      onSearch={noop}
      onReset={noop}
      onOpenNearbyMap={noop}
      onClearNearby={noop}
      hasNearbySelection={false}
      nearbySummary=""
      nearbyHint=""
      labels={labels}
      {...overrides}
    />,
  );

describe("AdvancedPropertySearchBar price range", () => {
  afterEach(cleanup);

  it("opens with the price a visitor already chose, in labelled fields", () => {
    renderBar({
      minPriceValue: "1000",
      maxPriceValue: "2000",
      onMinPriceChange: noop,
      onMaxPriceChange: noop,
      defaultFiltersOpen: true,
    });

    expect(
      (screen.getByLabelText("Min price (TND)") as HTMLInputElement).value,
    ).toBe("1000");
    expect(
      (screen.getByLabelText("Max price (TND)") as HTMLInputElement).value,
    ).toBe("2000");
  });

  it("reports edits to both bounds", () => {
    const onMin = vi.fn();
    const onMax = vi.fn();
    renderBar({
      onMinPriceChange: onMin,
      onMaxPriceChange: onMax,
      defaultFiltersOpen: true,
    });

    fireEvent.change(screen.getByLabelText("Min price (TND)"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText("Max price (TND)"), {
      target: { value: "900" },
    });

    expect(onMin).toHaveBeenCalledWith("500");
    expect(onMax).toHaveBeenCalledWith("900");
  });

  it("leaves the price out where a page does not use it", () => {
    renderBar({ defaultFiltersOpen: true });
    expect(screen.queryByLabelText("Min price (TND)")).toBeNull();
  });

  it("keeps the filters collapsed unless asked to open", () => {
    renderBar({ onMinPriceChange: noop, onMaxPriceChange: noop });
    expect(screen.queryByLabelText("Min price (TND)")).toBeNull();
  });
});
