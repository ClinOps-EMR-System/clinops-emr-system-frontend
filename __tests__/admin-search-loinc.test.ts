import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/lib/api", () => ({
  api: { get: mocks.get },
}));

import { adminApi } from "@/lib/services/admin";

describe("adminApi.searchLoinc", () => {
  beforeEach(() => vi.clearAllMocks());

  it("unwraps the envelope and returns the LOINC array", async () => {
    const loinc = {
      id: 1,
      code: "882-1",
      display_name: "Hemoglobin [Mass/volume] in Blood",
      component_name: "Hemoglobin",
      system: "Bld",
      order_obs: "Both",
      status: "ACTIVE",
      units: [{ unit_id: 1, unit_name: "g/dL", primary: true }],
    };
    mocks.get.mockResolvedValue({ status: 200, message: "success", data: [loinc] });

    const result = await adminApi.searchLoinc("tok", "hemo");

    expect(mocks.get).toHaveBeenCalledWith("/loinc/search?q=hemo", "tok");
    expect(result).toEqual([loinc]);
  });
});
