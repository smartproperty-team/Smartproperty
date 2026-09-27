// ===========================================
// Frontend - formatBytes tests
// ===========================================

import { describe, expect, it } from "vitest";

import { formatBytes } from "../format";

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [-5, "0 B"],
    [Number.NaN, "0 B"],
    [0.5, "0.5 B"],
    [512, "512 B"],
    [1024, "1 KB"],
    [1536, "1.5 KB"],
    [5 * 1024 * 1024, "5 MB"],
    [1.25 * 1024 ** 3, "1.3 GB"],
    // Beyond GB stays in GB rather than printing "undefined".
    [3 * 1024 ** 4, "3072 GB"],
  ])("%d bytes -> %s", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});
