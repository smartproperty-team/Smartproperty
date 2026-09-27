// ===========================================
// Frontend - HotspotMarker keyboard access tests
// ===========================================

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// drei's <Html> needs a three.js canvas; render its children directly.
vi.mock("@react-three/drei", () => ({
  Html: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import HotspotMarker from "../HotspotMarker";

describe("HotspotMarker", () => {
  beforeEach(() => {
    // <group> is a three.js element React DOM does not know; the warning is expected here.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const renderMarker = () => {
    const onClick = vi.fn();
    render(
      <HotspotMarker position={[0, 0, 0]} label="Kitchen" onClick={onClick} />,
    );
    return {
      onClick,
      marker: screen.getByRole("button", { name: "Go to Kitchen" }),
    };
  };

  it("is a focusable button named after its room", () => {
    const { marker } = renderMarker();
    expect(marker.tabIndex).toBe(0);
  });

  it.each(["Enter", " "])("opens the room on %j", (key) => {
    const { onClick, marker } = renderMarker();
    fireEvent.keyDown(marker, { key });
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("ignores other keys", () => {
    const { onClick, marker } = renderMarker();
    fireEvent.keyDown(marker, { key: "a" });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("still opens on click", () => {
    const { onClick, marker } = renderMarker();
    fireEvent.click(marker);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
