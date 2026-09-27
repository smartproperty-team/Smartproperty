// ===========================================
// SmartProperty - Accessibility helpers
// ===========================================

import type { KeyboardEvent } from "react";

/**
 * Keyboard activation for an element given role="button": Enter or Space,
 * as a native button behaves. Call it from inside onKeyDown -
 * `onKeyDown={(e) => activateOnKey(e, open)}` - so the handler only ever
 * runs in the event, never during render.
 */
export const activateOnKey = <T extends Element>(
  event: KeyboardEvent<T>,
  handler: () => void,
): void => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    handler();
  }
};

/**
 * Step for a role="slider" arrow key: +step for Right/Up, -step for
 * Left/Down, 0 for any other key.
 */
export const arrowKeyStep = (key: string, step: number): number => {
  if (key === "ArrowRight" || key === "ArrowUp") return step;
  if (key === "ArrowLeft" || key === "ArrowDown") return -step;
  return 0;
};

/** Clamp to the 0-100 range a percentage slider uses. */
export const clampPercent = (value: number): number =>
  Math.min(100, Math.max(0, value));

/**
 * onKeyDown for a 0-100 role="slider": the arrow keys move it by `step`,
 * any other key is left alone.
 */
export const stepPercentSlider = (
  event: KeyboardEvent,
  setValue: (update: (value: number) => number) => void,
  step: number,
): void => {
  const delta = arrowKeyStep(event.key, step);
  if (delta === 0) return;
  event.preventDefault();
  setValue((value) => clampPercent(value + delta));
};
