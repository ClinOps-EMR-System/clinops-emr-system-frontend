import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLabResults } from "../hooks/useLabResults";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/lib/api", () => ({ api: { get: mocks.get } }));

describe("useLabResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ data: { data: [] } });
  });

  it("does not fetch while disabled", () => {
    renderHook(() => useLabResults(2, "token", false));
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("fetches the encounter lab-results endpoint when enabled", async () => {
    const { result } = renderHook(() => useLabResults(2, "token", true));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/encounters/2/lab-results", "token"));
    expect(result.current.results).toEqual([]);
  });

  it("normalizes the { data } envelope", async () => {
    mocks.get.mockResolvedValue({ data: { data: [{ id: 1 }] } });
    const { result } = renderHook(() => useLabResults(2, "token", true));
    await waitFor(() => expect(result.current.results).toEqual([{ id: 1 }]));
  });

  it("exposes refetch that re-calls the API", async () => {
    const { result } = renderHook(() => useLabResults(2, "token", true));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
    result.current.refetch();
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
  });

  it("sets error when the request fails", async () => {
    mocks.get.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useLabResults(2, "token", true));
    await waitFor(() => expect(result.current.error).toBe("boom"));
  });
});
