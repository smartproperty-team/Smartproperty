// ===========================================
// Frontend - accessibility helper tests
// ===========================================

import type { KeyboardEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  activateOnKey,
  arrowKeyStep,
  clampPercent,
  stepPercentSlider,
} from "../a11y";

const keyEvent = (key: string) =>
  ({ key, preventDefault: vi.fn() }) as unknown as KeyboardEvent<HTMLElement>;

describe("activateOnKey", () => {
  it.each(["Enter", " "])(
    "activates on %j and suppresses the default",
    (key) => {
      const handler = vi.fn();
      const event = keyEvent(key);

      activateOnKey(event, handler);

      expect(handler).toHaveBeenCalledOnce();
      expect(event.preventDefault).toHaveBeenCalled();
    },
  );

  it.each(["Tab", "Escape", "a", "ArrowDown"])("ignores %j", (key) => {
    const handler = vi.fn();
    const event = keyEvent(key);

    activateOnKey(event, handler);

    expect(handler).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});

describe("arrowKeyStep", () => {
  it.each([
    ["ArrowRight", 5],
    ["ArrowUp", 5],
    ["ArrowLeft", -5],
    ["ArrowDown", -5],
    ["Enter", 0],
  ])("%s -> %i", (key, expected) => {
    expect(arrowKeyStep(key, 5)).toBe(expected);
  });
});

describe("stepPercentSlider", () => {
  // Applies the updater the slider passes to setState, starting from `from`.
  const press = (key: string, from: number) => {
    let value = from;
    const event = keyEvent(key);
    stepPercentSlider(event, (update) => (value = update(value)), 5);
    return { value, event };
  };

  it("moves right and left by the step", () => {
    expect(press("ArrowRight", 50).value).toBe(55);
    expect(press("ArrowLeft", 50).value).toBe(45);
  });

  it("stops at the ends", () => {
    expect(press("ArrowRight", 98).value).toBe(100);
    expect(press("ArrowLeft", 2).value).toBe(0);
  });

  it("leaves other keys, and the page scroll, alone", () => {
    const { value, event } = press("Tab", 50);
    expect(value).toBe(50);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});

describe("clampPercent", () => {
  it.each([
    [-10, 0],
    [0, 0],
    [42, 42],
    [100, 100],
    [130, 100],
  ])("%i -> %i", (value, expected) => {
    expect(clampPercent(value)).toBe(expected);
  });
});
