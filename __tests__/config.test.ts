import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;

describe("environment config", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses the explicit API base URL from the environment", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://example.test/api";

    const { getApiBaseUrl } = await import("../lib/config");

    expect(getApiBaseUrl()).toBe("https://example.test/api");
  });

  it("falls back to the local backend when no production override is present", async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_APP_ENV = "development";

    const { getApiBaseUrl } = await import("../lib/config");

    expect(getApiBaseUrl()).toBe("http://localhost:18081/api");
  });

  it("falls back to the production backend when production mode is selected", async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_APP_ENV = "production";

    const { getApiBaseUrl } = await import("../lib/config");

    expect(getApiBaseUrl()).toBe("https://clinops.dpdns.org/api");
  });
});
