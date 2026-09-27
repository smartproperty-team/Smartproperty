// ===========================================
// Frontend - email validation tests
// ===========================================

import { describe, expect, it } from "vitest";

import { isValidEmail } from "../authValidation";

describe("isValidEmail", () => {
  it.each([
    "user@example.com",
    "first.last@sub.example.co.uk",
    "a+tag@x.io",
    "owner@smartproperty.com",
  ])("accepts %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    "",
    "no-at-sign.com",
    "two@@example.com",
    "space in@example.com",
    "user@nodot",
    "user@example.",
    "user@.example.com",
    "user@example..com",
  ])("rejects %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("stays fast on long hostile input", () => {
    // The previous pattern took about 1.5 s on this input.
    const hostile = "a@" + ".".repeat(40000) + "@";
    const start = performance.now();
    expect(isValidEmail(hostile)).toBe(false);
    expect(performance.now() - start).toBeLessThan(50);
  });
});
