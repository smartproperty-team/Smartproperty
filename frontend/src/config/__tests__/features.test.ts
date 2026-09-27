// ===========================================
// Frontend - feature switch tests
// ===========================================

import { afterEach, describe, expect, it, vi } from "vitest";

// The flag is read once at module load, so each case re-imports it.
const loadFlag = async (value: string) => {
  vi.stubEnv("VITE_ENABLE_AI_FEATURES", value);
  vi.resetModules();
  return (await import("../features")).AI_FEATURES_ENABLED;
};

describe("AI_FEATURES_ENABLED", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off when the variable is not set", async () => {
    expect(await loadFlag("")).toBe(false);
  });

  it("is on for exactly 'true'", async () => {
    expect(await loadFlag("true")).toBe(true);
  });

  it.each(["1", "yes", "TRUE", "false"])("is off for %s", async (value) => {
    expect(await loadFlag(value)).toBe(false);
  });
});
