import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useImagingRequests } from "../hooks/useImagingRequests";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  subscribe: vi.fn<(channel: string, cb: () => void) => () => void>(
    () => () => {}
  ),
}));

vi.mock("@/lib/api", () => ({ api: { get: mocks.get } }));
vi.mock("@/lib/realtime", () => ({ subscribe: mocks.subscribe }));

describe("useImagingRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ data: { data: [] } });
  });

  it("does not fetch or subscribe while disabled", () => {
    renderHook(() => useImagingRequests(2, "token", false));
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });

  it("fetches and subscribes to both radiology channels when enabled", async () => {
    renderHook(() => useImagingRequests(2, "token", true));
    await waitFor(() =>
      expect(mocks.get).toHaveBeenCalledWith("/encounters/2/imaging", "token")
    );
    expect(mocks.subscribe).toHaveBeenCalledWith(
      "clinops_radiology_requests",
      expect.any(Function)
    );
    expect(mocks.subscribe).toHaveBeenCalledWith(
      "clinops_radiology_results",
      expect.any(Function)
    );
  });

  it("refetches when a radiology event arrives", async () => {
    let handler: (() => void) | null = null;
    mocks.subscribe.mockImplementation((_channel: string, cb: () => void) => {
      handler = cb;
      return () => {};
    });

    const { result } = renderHook(() => useImagingRequests(2, "token", true));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));

    act(() => {
      handler?.();
    });
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
  });

  it("unsubscribes both channels on unmount", () => {
    const offs = vi.fn();
    mocks.subscribe.mockReturnValue(offs);
    const { unmount } = renderHook(() => useImagingRequests(2, "token", true));
    unmount();
    expect(offs).toHaveBeenCalledTimes(2);
  });
});
