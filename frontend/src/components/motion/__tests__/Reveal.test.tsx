// ===========================================
// Frontend - Reveal component tests
// ===========================================

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Reveal } from "../Reveal";

let trigger: (isIntersecting: boolean) => void;

class FakeObserver {
  constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
    trigger = (isIntersecting) => callback([{ isIntersecting }]);
  }
  observe() {}
  disconnect() {}
}

describe("Reveal", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the requested element with its variant", () => {
    render(
      <Reveal as="ul" variant="scale" stagger className="grid">
        <li>One</li>
      </Reveal>,
    );
    const list = screen.getByRole("list");

    expect(list.tagName).toBe("UL");
    expect(list.className).toBe("grid");
    expect(list.dataset.reveal).toBe("scale");
    expect(list).toHaveProperty("dataset.revealStagger", "");
    expect(list.dataset.revealed).toBeUndefined();
  });

  it("marks itself revealed once it scrolls into view", () => {
    render(<Reveal>Hello</Reveal>);
    const block = screen.getByText("Hello");

    act(() => trigger(true));

    expect(block.dataset.revealed).toBe("");
  });

  it("passes a delay through as a CSS variable", () => {
    render(<Reveal delay={200}>Later</Reveal>);
    expect(
      screen.getByText("Later").style.getPropertyValue("--reveal-delay"),
    ).toBe("200ms");
  });
});
