import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminApi } from "@/lib/services/admin";
import { usePayChanguCharge } from "@/lib/hooks/usePayChanguCharge";
import type { PayChanguChargeResult } from "@/lib/services/admin";

vi.mock("@/lib/services/admin", () => ({
  adminApi: {
    getPayChanguOperators: vi.fn(),
    initializePayChanguPayment: vi.fn(),
    verifyPayChanguPayment: vi.fn(),
  },
}));

const mockedAdminApi = vi.mocked(adminApi);

describe("usePayChanguCharge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads operators and surfaces errors", async () => {
    mockedAdminApi.getPayChanguOperators.mockResolvedValueOnce({
      operators: [{ id: 1, name: "Airtel Money", ref_id: "airtel", short_code: "AM" }],
    });

    const { result } = renderHook(() => usePayChanguCharge({ token: "t" }));
    await result.current.ensureOperatorsLoaded();
    await waitFor(() => {
      expect(result.current.operators).toHaveLength(1);
      expect(result.current.operators[0].name).toBe("Airtel Money");
    });
  });

  it("initializes a charge and calls onCompleted when verified", async () => {
    const charge: PayChanguChargeResult = {
      charge_id: "pc-1",
      trans_id: "tr-1",
      status: "pending",
      currency: "MWK",
      amount: 1000,
      mobile: "990000000",
      operator: "Airtel Money",
      payment_id: 42,
    };
    mockedAdminApi.initializePayChanguPayment.mockResolvedValueOnce(charge);
    mockedAdminApi.verifyPayChanguPayment.mockResolvedValueOnce({
      status: "completed",
      amount: 1000,
      completed_at: "2026-08-05T00:00:00Z",
      operator: "Airtel Money",
      currency: "MWK",
    });

    const onCompleted = vi.fn();
    const { result } = renderHook(() =>
      usePayChanguCharge({ token: "t", onCompleted })
    );

    await result.current.initialize(1, 1000);
    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
    expect(onCompleted).toHaveBeenCalledWith(charge);
  });
});
