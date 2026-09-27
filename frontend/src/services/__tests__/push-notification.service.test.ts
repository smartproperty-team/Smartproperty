// ===========================================
// Frontend - push subscription upload tests
// ===========================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import api from "../api";
import { pushNotificationService } from "../push-notification.service";

describe("pushNotificationService - sending the subscription", () => {
  const subscriptionJson = {
    endpoint: "https://push.example/endpoint-123",
    keys: { p256dh: "PUBLIC-KEY", auth: "SECRET-AUTH-KEY" },
  };
  const subscription = {
    toJSON: () => subscriptionJson,
  } as unknown as PushSubscription;

  // The method is private; it is the unit that talks to the backend.
  const send = (sub: PushSubscription) =>
    (
      pushNotificationService as unknown as {
        sendSubscriptionToBackend: (s: PushSubscription) => Promise<void>;
      }
    ).sendSubscriptionToBackend(sub);

  let postSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    postSpy = vi.spyOn(api, "post");
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts the subscription to the backend", async () => {
    postSpy.mockResolvedValue({ data: { ok: true } });

    await send(subscription);

    expect(postSpy).toHaveBeenCalledWith(
      "/notifications/push/subscribe",
      subscriptionJson,
    );
  });

  it("never writes the subscription keys to the console", async () => {
    postSpy.mockResolvedValue({ data: { token: "server-data" } });

    await send(subscription);

    const logged = JSON.stringify([
      ...logSpy.mock.calls,
      ...errorSpy.mock.calls,
    ]);
    expect(logged).not.toContain("SECRET-AUTH-KEY");
    expect(logged).not.toContain("server-data");
  });

  it("reports a failed upload without throwing", async () => {
    postSpy.mockRejectedValue(new Error("network down"));

    await expect(send(subscription)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});
