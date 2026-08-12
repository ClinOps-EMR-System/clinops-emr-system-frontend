import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TriageQueuePage from "../app/(app)/triage-queue/page";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("@/lib/useFetch", () => ({
  useFetch: (endpoint: string) => mocks.fetch(endpoint),
}));

const entry = {
  encounter_id: 3,
  encounter_type: "outpatient",
  source: "walk-in",
  patient: { id: 15, hospital_number: "000015", full_name: "Peter Kachale" },
  status: "awaiting_triage",
  chief_complaint: "Fever",
  triage_priority: null,
  arrived_at: "2026-08-07T18:30:04.000Z",
  wait_time_minutes: 234.5,
};

describe("TriageQueuePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetch.mockReturnValue({ data: [entry] });
  });

  it("formats a fractional wait time as whole hours and minutes", async () => {
    render(<TriageQueuePage />);

    expect(await screen.findByText("Peter Kachale")).toBeInTheDocument();
    expect(screen.getByText("3h 54m")).toBeInTheDocument();
  });

  it("formats a sub-hour fractional wait time as whole minutes", async () => {
    mocks.fetch.mockReturnValue({ data: [{ ...entry, wait_time_minutes: 54.9 }] });
    render(<TriageQueuePage />);

    expect(await screen.findByText("54m")).toBeInTheDocument();
  });
});
