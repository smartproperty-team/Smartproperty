// ===========================================
// Filters dialog: staged changes, live count, apply
// ===========================================

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PropertyFilters } from "../../../../types/property";
import { FiltersDialog, type CountFetcher } from "../FiltersDialog";

const histogram = { min: 500, max: 3000, median: 1200, buckets: [1, 3, 2] };

const deferred = () => {
  let resolve!: (value: Awaited<ReturnType<CountFetcher>>) => void;
  const promise = new Promise<Awaited<ReturnType<CountFetcher>>>(
    (r) => (resolve = r),
  );
  return { promise, resolve };
};

const renderDialog = (
  filters: PropertyFilters = {},
  fetchCount: CountFetcher = vi
    .fn()
    .mockResolvedValue({ total: 12, priceHistogram: histogram }),
) => {
  const onApply = vi.fn();
  const onClose = vi.fn();
  render(
    <FiltersDialog
      filters={filters}
      fetchCount={fetchCount}
      onApply={onApply}
      onClose={onClose}
    />,
  );
  return { onApply, onClose, fetchCount, dialog: screen.getByRole("dialog") };
};

// Let the debounce run out and the count answer.
const settle = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });

describe("FiltersDialog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("counts what the staged filters would show, with the rest of the search", async () => {
    const { fetchCount, dialog } = renderDialog({
      search: "sea",
      category: "rental",
    });
    await settle();

    expect(
      within(dialog).getByRole("button", { name: "Show 12 properties" }),
    ).toBeTruthy();
    expect(fetchCount).toHaveBeenCalledWith(
      expect.objectContaining({ search: "sea", category: "rental" }),
      true,
    );

    fireEvent.click(
      within(dialog).getByRole("button", { name: "More bedrooms" }),
    );
    await settle();

    expect(fetchCount).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "sea", minBedrooms: 1 }),
      // Rooms change which listings match, so their price spread too.
      true,
    );
  });

  it("asks for the price spread again only when it can change", async () => {
    const { fetchCount, dialog } = renderDialog();
    await settle();
    expect(fetchCount).toHaveBeenLastCalledWith(expect.anything(), true);

    const min = within(dialog).getByLabelText("Minimum");
    fireEvent.change(min, { target: { value: "900" } });
    fireEvent.blur(min);
    await settle();
    // Price alone: the histogram ignores it.
    expect(fetchCount).toHaveBeenLastCalledWith(
      expect.objectContaining({ minPrice: 900 }),
      false,
    );

    fireEvent.click(within(dialog).getByRole("radio", { name: "Buy" }));
    await settle();
    expect(fetchCount).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: "sale" }),
      true,
    );
  });

  it("shows the newest count when an older one answers last", async () => {
    const older = deferred();
    const newer = deferred();
    const fetchCount = vi
      .fn()
      .mockResolvedValueOnce({ total: 12, priceHistogram: histogram })
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    const { dialog } = renderDialog({}, fetchCount);
    await settle();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "More bedrooms" }),
    );
    await settle();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "More bedrooms" }),
    );
    await settle();

    await act(async () => {
      newer.resolve({ total: 3 });
      older.resolve({ total: 9 });
    });

    expect(
      within(dialog).getByRole("button", { name: "Show 3 properties" }),
    ).toBeTruthy();
  });

  it("sends one count for a burst of changes", async () => {
    const { fetchCount, dialog } = renderDialog();
    await settle();
    const before = vi.mocked(fetchCount).mock.calls.length;

    const more = within(dialog).getByRole("button", { name: "More bedrooms" });
    fireEvent.click(more);
    fireEvent.click(more);
    fireEvent.click(more);
    await settle();

    expect(vi.mocked(fetchCount).mock.calls.length).toBe(before + 1);
    expect(fetchCount).toHaveBeenLastCalledWith(
      expect.objectContaining({ minBedrooms: 3 }),
      true,
    );
  });

  it("applies the staged filters only on Show", async () => {
    const { onApply, dialog } = renderDialog({ amenities: ["pool"] });
    await settle();

    fireEvent.click(within(dialog).getByRole("button", { name: "Villa" }));
    fireEvent.click(within(dialog).getByRole("switch", { name: "Furnished" }));
    // Already on, whatever its case in the URL.
    expect(
      within(dialog)
        .getByRole("button", { name: "Pool" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(within(dialog).getByRole("button", { name: "Wi-Fi" }));
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.click(
      within(dialog).getByRole("button", { name: /^Show \d+ propert/ }),
    );

    expect(onApply).toHaveBeenCalledWith({
      amenities: ["pool", "WiFi"],
      types: ["villa"],
      furnished: true,
    });
  });

  it("steps rooms from Any to 2+ and back", async () => {
    const { dialog } = renderDialog();
    const bedrooms = within(dialog).getByRole("group", { name: "Bedrooms" });

    expect(within(bedrooms).getByText("Any")).toBeTruthy();
    expect(
      (
        within(bedrooms).getByRole("button", {
          name: "Fewer bedrooms",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(
      within(bedrooms).getByRole("button", { name: "More bedrooms" }),
    );
    fireEvent.click(
      within(bedrooms).getByRole("button", { name: "More bedrooms" }),
    );
    expect(within(bedrooms).getByText("2+")).toBeTruthy();
    fireEvent.click(
      within(bedrooms).getByRole("button", { name: "Fewer bedrooms" }),
    );
    fireEvent.click(
      within(bedrooms).getByRole("button", { name: "Fewer bedrooms" }),
    );
    expect(within(bedrooms).getByText("Any")).toBeTruthy();
  });

  it("clears the panel's filters, and closes on Escape without applying", async () => {
    const { onApply, onClose, dialog } = renderDialog({
      search: "sea",
      petFriendly: true,
    });
    const clearAll = within(dialog).getByRole("button", { name: "Clear all" });
    expect((clearAll as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(clearAll);
    expect(
      within(dialog)
        .getByRole("switch", { name: "Pet friendly" })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect((clearAll as HTMLButtonElement).disabled).toBe(true);

    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("cannot show nothing", async () => {
    const { dialog } = renderDialog(
      {},
      vi.fn().mockResolvedValue({ total: 0, priceHistogram: null }),
    );
    await settle();

    const show = within(dialog).getByRole("button", { name: "No matches yet" });
    expect((show as HTMLButtonElement).disabled).toBe(true);
    expect(within(dialog).getByText(/no prices to show/)).toBeTruthy();
  });
});
