import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFieldErrors } from "../useFieldErrors";

type Key = "title" | "price" | "city";

/** Rules under test: title and price required, city required. */
const makeCompute = (state: Record<Key, string>) => () => {
  const e: Partial<Record<Key, string>> = {};
  if (!state.title) e.title = "Title is required";
  if (!state.price) e.price = "Price is required";
  if (!state.city) e.city = "City is required";
  return e;
};

describe("useFieldErrors", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    // jsdom has no rAF scheduling guarantees; run callbacks immediately.
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  it("reports only the fields it was asked to validate", () => {
    const state: Record<Key, string> = { title: "", price: "", city: "" };
    const { result } = renderHook(() => useFieldErrors<Key>(makeCompute(state)));

    let ok = true;
    act(() => {
      ok = result.current.validateFields(["title"], { focus: false });
    });

    expect(ok).toBe(false);
    expect(result.current.errors.title).toBe("Title is required");
    // price and city are invalid too, but were not requested
    expect(result.current.errors.price).toBeUndefined();
    expect(result.current.errors.city).toBeUndefined();
  });

  it("returns true when the requested fields are valid", () => {
    const state: Record<Key, string> = { title: "Villa", price: "", city: "" };
    const { result } = renderHook(() => useFieldErrors<Key>(makeCompute(state)));

    let ok = false;
    act(() => {
      ok = result.current.validateFields(["title"], { focus: false });
    });

    expect(ok).toBe(true);
    expect(result.current.errors.title).toBeUndefined();
  });

  it("replaces rather than merges, so a fixed field stops blocking", () => {
    // This is the regression that made the wizard feel broken: an error from
    // an earlier step survived being corrected and silently blocked Next.
    const state: Record<Key, string> = { title: "", price: "", city: "" };
    const { result, rerender } = renderHook(() =>
      useFieldErrors<Key>(makeCompute(state)),
    );

    act(() => {
      result.current.validateFields(["title"], { focus: false });
    });
    expect(result.current.errors.title).toBe("Title is required");

    state.title = "Now filled";
    rerender();

    let ok = false;
    act(() => {
      ok = result.current.validateFields(["title"], { focus: false });
    });

    expect(ok).toBe(true);
    expect(result.current.errors.title).toBeUndefined();
  });

  it("leaves errors for fields it was not asked about", () => {
    const state: Record<Key, string> = { title: "", price: "", city: "" };
    const { result } = renderHook(() => useFieldErrors<Key>(makeCompute(state)));

    act(() => {
      result.current.validateFields(["title"], { focus: false });
    });
    act(() => {
      result.current.validateFields(["price"], { focus: false });
    });

    expect(result.current.errors.title).toBe("Title is required");
    expect(result.current.errors.price).toBe("Price is required");
  });

  it("focuses and scrolls to the first invalid field", () => {
    const input = document.createElement("input");
    input.id = "price";
    document.body.appendChild(input);
    input.scrollIntoView = vi.fn();

    const state: Record<Key, string> = { title: "ok", price: "", city: "" };
    const { result } = renderHook(() => useFieldErrors<Key>(makeCompute(state)));

    act(() => {
      result.current.validateFields(["title", "price"]);
    });

    expect(document.activeElement).toBe(input);
    expect(input.scrollIntoView).toHaveBeenCalled();
  });

  it("does not steal focus on blur", () => {
    const input = document.createElement("input");
    input.id = "title";
    document.body.appendChild(input);
    input.scrollIntoView = vi.fn();

    const state: Record<Key, string> = { title: "", price: "", city: "" };
    const { result } = renderHook(() => useFieldErrors<Key>(makeCompute(state)));

    act(() => {
      result.current.handleBlur("title");
    });

    expect(result.current.errors.title).toBe("Title is required");
    expect(input.scrollIntoView).not.toHaveBeenCalled();
  });

  it("clearError removes a single message", () => {
    const state: Record<Key, string> = { title: "", price: "", city: "" };
    const { result } = renderHook(() => useFieldErrors<Key>(makeCompute(state)));

    act(() => {
      result.current.validateFields(["title", "price"], { focus: false });
    });
    act(() => {
      result.current.clearError("title");
    });

    expect(result.current.errors.title).toBeUndefined();
    expect(result.current.errors.price).toBe("Price is required");
  });

  it("exposes accessibility attributes only while invalid", () => {
    const state: Record<Key, string> = { title: "", price: "", city: "" };
    const { result } = renderHook(() => useFieldErrors<Key>(makeCompute(state)));

    expect(result.current.fieldProps("title")["aria-invalid"]).toBeUndefined();
    expect(
      result.current.fieldProps("title")["aria-describedby"],
    ).toBeUndefined();

    act(() => {
      result.current.validateFields(["title"], { focus: false });
    });

    const props = result.current.fieldProps("title");
    expect(props["aria-invalid"]).toBe(true);
    expect(props["aria-describedby"]).toBe("title-error");
    expect(props.className).toBe("error");
    // the message element's id must match what aria-describedby points at
    expect(result.current.errorProps("title").id).toBe("title-error");
    expect(result.current.errorProps("title").role).toBe("alert");
  });
});
