import { describe, it, expect } from "vitest";
import { EMR_CHANNELS } from "../lib/realtime";

describe("EMR_CHANNELS", () => {
  it("includes the notifications channel for instant bell refresh", () => {
    expect(EMR_CHANNELS).toContain("clinops_notifications");
  });

  it("includes the radiology channels for the imaging worklist", () => {
    expect(EMR_CHANNELS).toContain("clinops_radiology_requests");
    expect(EMR_CHANNELS).toContain("clinops_radiology_results");
  });
});
