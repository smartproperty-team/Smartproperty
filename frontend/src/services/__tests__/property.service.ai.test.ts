// ===========================================
// Frontend - propertyService AI description tests
// ===========================================

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { api } from "../api";
import { propertyService } from "../property.service";

describe("propertyService.generateAiDescription", () => {
  let postSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    postSpy = vi.spyOn(api, "post");
  });

  afterEach(() => {
    postSpy.mockRestore();
  });

  it("posts to the backend marketing endpoint and returns variants", async () => {
    const payload = {
      variants: [
        {
          length: "short" as const,
          tone: "warm" as const,
          language: "en",
          text: "A bright apartment in central Paris.",
          wordCount: 7,
        },
      ],
      metadata: {
        generationId: "g-1",
        modelName: "google/flan-t5-base",
        modelVersion: "transformers",
        cacheHit: false,
        latencyMs: 120,
      },
    };
    postSpy.mockResolvedValueOnce({ data: payload } as never);

    const result = await propertyService.generateAiDescription({
      propertySnapshot: { title: "Cozy", city: "Paris" },
      tone: "warm",
      lengths: ["short"],
      sourceLanguage: "en",
      targetLanguages: ["en"],
    });

    // The service also forwards propertySnapshot and passes a request timeout
    // as a third argument; assert on the body and allow the options object.
    expect(postSpy).toHaveBeenCalledWith(
      "/properties/ai/descriptions/generate",
      expect.objectContaining({
        tone: "warm",
        lengths: ["short"],
        sourceLanguage: "en",
        targetLanguages: ["en"],
        propertySnapshot: { title: "Cozy", city: "Paris" },
      }),
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0].language).toBe("en");
    expect(result.metadata.modelName).toContain("flan-t5");
  });

  it("propagates errors from the backend (e.g. timeout)", async () => {
    const err = Object.assign(new Error("timeout"), {
      response: { status: 504, data: { message: "AI service request timed out" } },
    });
    postSpy.mockRejectedValueOnce(err as never);

    await expect(
      propertyService.generateAiDescription({
        propertySnapshot: { title: "Cozy" },
        tone: "professional",
        lengths: ["medium"],
        sourceLanguage: "en",
        targetLanguages: ["fr"],
      }),
    ).rejects.toMatchObject({ response: { status: 504 } });
  });
});
