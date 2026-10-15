// ===========================================
// Search bar: suggestions, keyboard, staged values
// ===========================================

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PropertySearchSuggestion } from "../../../../types/property";
import {
  ListingSearchBar,
  SUGGEST_THROTTLE_MS,
  type ListingSearchValue,
} from "../ListingSearchBar";

const places: PropertySearchSuggestion[] = [
  { label: "Sousse", kind: "city", count: 4 },
  { label: "Nabeul", kind: "region", count: 1 },
];

const renderBar = (
  props: Partial<Parameters<typeof ListingSearchBar>[0]> = {},
) => {
  const onSearch = vi.fn<(value: ListingSearchValue) => void>();
  const onOpenNearby = vi.fn();
  const fetchSuggestions = vi.fn().mockResolvedValue(places);
  render(
    <ListingSearchBar
      onSearch={onSearch}
      fetchSuggestions={fetchSuggestions}
      onOpenNearby={onOpenNearby}
      onClearNearby={vi.fn()}
      {...props}
    />,
  );
  return {
    onSearch,
    onOpenNearby,
    fetchSuggestions,
    where: screen.getByRole("combobox", { name: "Where" }),
  };
};

const flush = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });

describe("ListingSearchBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("asks for suggestions at most once per 300 ms, always with the latest text", async () => {
    const { where, fetchSuggestions } = renderBar();

    fireEvent.focus(where);
    await flush();
    expect(fetchSuggestions).toHaveBeenLastCalledWith("");

    // Typing every 100 ms, like Airbnb's recording of "Sousse".
    for (const text of ["S", "So", "Sou", "Sous", "Souss", "Sousse"]) {
      fireEvent.change(where, { target: { value: text } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
    }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SUGGEST_THROTTLE_MS);
    });

    const queries = fetchSuggestions.mock.calls.map(([q]) => q);
    expect(queries.length).toBeLessThanOrEqual(4);
    expect(queries[queries.length - 1]).toBe("Sousse");
  });

  it("lists places with their listing counts, after the map option", async () => {
    const { where } = renderBar();
    fireEvent.focus(where);
    await flush();

    const options = screen.getAllByRole("option");
    expect(options[0].textContent).toContain("Near a point on the map");
    expect(options[1].textContent).toContain("Sousse");
    expect(options[1].textContent).toContain("4 listings");
    expect(options[2].textContent).toContain("Region");
    expect(options[2].textContent).toContain("1 listing");
  });

  it("picks a place with the keyboard and moves on to the next field", async () => {
    const { where, onSearch } = renderBar();
    fireEvent.focus(where);
    await flush();

    fireEvent.keyDown(where, { key: "ArrowDown" });
    fireEvent.keyDown(where, { key: "ArrowDown" });
    expect(where.getAttribute("aria-activedescendant")).toBe(
      screen.getAllByRole("option")[1].id,
    );
    fireEvent.keyDown(where, { key: "Enter" });

    expect((where as HTMLInputElement).value).toBe("Sousse");
    fireEvent.click(screen.getByRole("radio", { name: /^Rent/ }));
    // Then the home type opens.
    fireEvent.click(screen.getByRole("button", { name: "Villa" }));
    fireEvent.click(screen.getByRole("button", { name: "Apartment" }));
    expect(onSearch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onSearch).toHaveBeenCalledWith({
      city: "Sousse",
      search: undefined,
      category: "rental",
      types: ["villa", "apartment"],
    });
  });

  it("searches typed text as a keyword, and a region as text", async () => {
    const { where, onSearch } = renderBar();
    fireEvent.focus(where);
    fireEvent.change(where, { target: { value: "  sea view " } });
    await flush();
    expect(
      screen.getByText(/look for “sea view” in every listing/),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "sea view", city: undefined }),
    );

    fireEvent.focus(where);
    await flush();
    fireEvent.click(screen.getByRole("option", { name: /Nabeul/ }));
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "Nabeul", city: undefined }),
    );
  });

  it("offers the map picker and shows the active nearby search", async () => {
    const { where, onOpenNearby } = renderBar({ nearbyLabel: "36.80, 10.18" });
    expect(where.getAttribute("placeholder")).toBe("Near 36.80, 10.18");

    fireEvent.focus(where);
    await flush();
    fireEvent.click(screen.getByRole("option", { name: /Near a point/ }));

    expect(onOpenNearby).toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows the applied search and closes when clicking elsewhere", async () => {
    renderBar({ city: "Tunis", category: "sale", types: ["house", "villa"] });

    expect(
      (screen.getByRole("combobox", { name: "Where" }) as HTMLInputElement)
        .value,
    ).toBe("Tunis");
    expect(screen.getByText("Buy")).toBeTruthy();
    expect(screen.getByText("House +1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Home type/ }));
    expect(screen.getByRole("group", { name: "Home type" })).toBeTruthy();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("group", { name: "Home type" })).toBeNull();
  });
});
