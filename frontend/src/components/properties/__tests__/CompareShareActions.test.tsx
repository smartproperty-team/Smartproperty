// ===========================================
// Frontend - compare and share card actions
// ===========================================

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompareShareActions } from "../CompareShareActions";

const renderActions = (overrides = {}) => {
  const props = {
    isCompared: false,
    compareFull: false,
    isSharing: false,
    onToggleCompare: vi.fn(),
    onShare: vi.fn(),
    ...overrides,
  };
  render(<CompareShareActions {...props} />);
  return props;
};

describe("CompareShareActions", () => {
  afterEach(cleanup);

  it("adds to the comparison and shares", () => {
    const props = renderActions();
    const compare = screen.getByRole("button", { name: "Add to compare" });
    expect(compare.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(compare);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(props.onToggleCompare).toHaveBeenCalledOnce();
    expect(props.onShare).toHaveBeenCalledOnce();
  });

  it("shows a compared listing as pressed, with the option to remove it", () => {
    renderActions({ isCompared: true });
    const compare = screen.getByRole("button", {
      name: "Remove from compare",
    });
    expect(compare.getAttribute("aria-pressed")).toBe("true");
  });

  it("blocks adding when the comparison is full, but not removing", () => {
    renderActions({ compareFull: true });
    expect(
      (
        screen.getByRole("button", {
          name: "Add to compare",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    cleanup();

    renderActions({ compareFull: true, isCompared: true });
    expect(
      (
        screen.getByRole("button", {
          name: "Remove from compare",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it("disables sharing while a share is in progress", () => {
    renderActions({ isSharing: true });
    const share = screen.getByRole("button", { name: "Loading..." });
    expect((share as HTMLButtonElement).disabled).toBe(true);
  });
});
