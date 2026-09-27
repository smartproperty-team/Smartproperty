// ===========================================
// Frontend - DateRangePicker accessibility tests
// ===========================================

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalyticsGranularity } from "../../../types/accounting";
import { DateRangePicker } from "../DateRangePicker";

const renderPicker = (overrides = {}) =>
  render(
    <DateRangePicker
      startDate="2026-01-01"
      endDate="2026-01-31"
      granularity={AnalyticsGranularity.MONTH}
      onStartDateChange={vi.fn()}
      onEndDateChange={vi.fn()}
      onGranularityChange={vi.fn()}
      {...overrides}
    />,
  );

describe("DateRangePicker", () => {
  afterEach(cleanup);

  it("names every field by its visible label", () => {
    renderPicker();

    expect(screen.getByLabelText("From")).toHaveProperty("value", "2026-01-01");
    expect(screen.getByLabelText("To")).toHaveProperty("value", "2026-01-31");
    expect(screen.getByLabelText("Granularity").tagName).toBe("SELECT");
  });

  it("reports edits through the labelled field", () => {
    const onStartDateChange = vi.fn();
    renderPicker({ onStartDateChange });

    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-02-01" },
    });

    expect(onStartDateChange).toHaveBeenCalledWith("2026-02-01");
  });

  it("gives two pickers on one page distinct ids", () => {
    renderPicker();
    renderPicker();

    const [first, second] = screen.getAllByLabelText("From");
    expect(first.id).toBeTruthy();
    expect(first.id).not.toBe(second.id);
  });
});
