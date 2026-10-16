// ===========================================
// Price range: slider scale, typed bounds, loading
// ===========================================

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PriceHistogram } from "../../../../types/property";
import { PriceRangeFilter } from "../PriceRangeFilter";

const histogram: PriceHistogram = {
  min: 0,
  max: 4000,
  median: 1000,
  buckets: [2, 5, 3, 1],
};

describe("PriceRangeFilter", () => {
  afterEach(cleanup);

  it("maps the slider on a square-root scale", () => {
    const onChange = vi.fn();
    render(<PriceRangeFilter histogram={histogram} onChange={onChange} />);

    // Half way along the track is a quarter of the price range.
    fireEvent.change(screen.getByLabelText("Minimum price"), {
      target: { value: "500" },
    });

    expect(onChange).toHaveBeenLastCalledWith({
      minPrice: 1000,
      maxPrice: undefined,
    });
  });

  it("keeps the handles apart and leaves the ends open", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PriceRangeFilter
        histogram={histogram}
        minPrice={1000}
        onChange={onChange}
      />,
    );

    // Dragged onto the minimum handle: stops 5% of the track above it.
    fireEvent.change(screen.getByLabelText("Maximum price"), {
      target: { value: "100" },
    });
    expect(onChange.mock.calls[0][0].maxPrice).toBe(1210);
    rerender(
      <PriceRangeFilter
        histogram={histogram}
        minPrice={1000}
        maxPrice={1210}
        onChange={onChange}
      />,
    );

    // At the very end means no upper limit ("4,000+").
    fireEvent.change(screen.getByLabelText("Maximum price"), {
      target: { value: "1000" },
    });
    expect(onChange.mock.calls[1][0]).toEqual({
      minPrice: 1000,
      maxPrice: undefined,
    });
  });

  it("swaps typed bounds that are the wrong way round", () => {
    const onChange = vi.fn();
    render(
      <PriceRangeFilter
        histogram={histogram}
        maxPrice={1500}
        onChange={onChange}
      />,
    );

    const min = screen.getByLabelText("Minimum");
    fireEvent.change(min, { target: { value: "3,000" } });
    fireEvent.blur(min);

    expect(onChange).toHaveBeenCalledWith({ minPrice: 1500, maxPrice: 3000 });
  });

  it("keeps what is being typed when the chart arrives", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PriceRangeFilter histogram={undefined} onChange={onChange} />,
    );
    const max = screen.getByLabelText("Maximum");
    fireEvent.change(max, { target: { value: "2500" } });

    rerender(<PriceRangeFilter histogram={histogram} onChange={onChange} />);

    expect(screen.getByLabelText("Maximum")).toBe(max);
    expect((max as HTMLInputElement).value).toBe("2500");
    fireEvent.blur(max);
    expect(onChange).toHaveBeenCalledWith({
      minPrice: undefined,
      maxPrice: 2500,
    });
  });

  it("marks the typical price and says when there is none", () => {
    const { rerender } = render(
      <PriceRangeFilter histogram={histogram} onChange={vi.fn()} />,
    );
    expect(screen.getByText("Typical 1,000 TND")).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: "Prices of the matching listings. Most cost around 1,000 TND.",
      }),
    ).toBeTruthy();

    rerender(<PriceRangeFilter histogram={null} onChange={vi.fn()} />);
    expect(screen.getByText(/no prices to show/)).toBeTruthy();
    expect(screen.queryByLabelText("Minimum price")).toBeNull();
  });
});
