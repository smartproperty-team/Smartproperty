// ===========================================
// Frontend - useReveal tests
// ===========================================

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useReveal } from "../useReveal";

type Callback = (entries: Array<{ isIntersecting: boolean }>) => void;

// Minimal IntersectionObserver double that lets a test decide visibility.
let observers: Array<{
  callback: Callback;
  disconnect: ReturnType<typeof vi.fn>;
}>;

class FakeObserver {
  disconnect = vi.fn();
  constructor(public callback: Callback) {
    observers.push(this);
  }
  observe() {}
}

function Probe({ show = true }: { show?: boolean }) {
  const { ref, revealed } = useReveal<HTMLDivElement>();
  return show ? (
    <div ref={ref} data-testid="probe">
      {revealed ? "revealed" : "hidden"}
    </div>
  ) : (
    <p>{revealed ? "revealed" : "hidden"}</p>
  );
}

const intersect = (isIntersecting: boolean) =>
  act(() => observers[observers.length - 1].callback([{ isIntersecting }]));

describe("useReveal", () => {
  beforeEach(() => {
    observers = [];
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("stays hidden until the element intersects, then reveals once", () => {
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("hidden");

    intersect(false);
    expect(screen.getByTestId("probe").textContent).toBe("hidden");

    intersect(true);
    expect(screen.getByTestId("probe").textContent).toBe("revealed");
    expect(observers[0].disconnect).toHaveBeenCalled();
  });

  it("disconnects when the component unmounts", () => {
    const { unmount } = render(<Probe />);
    unmount();
    expect(observers[0].disconnect).toHaveBeenCalled();
  });

  it("observes an element that mounts after the first render", () => {
    const { rerender } = render(<Probe show={false} />);
    expect(observers).toHaveLength(0);

    rerender(<Probe show />);
    expect(observers).toHaveLength(1);
    intersect(true);
    expect(screen.getByTestId("probe").textContent).toBe("revealed");
  });

  it("shows content straight away where IntersectionObserver is missing", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("revealed");
  });
});
