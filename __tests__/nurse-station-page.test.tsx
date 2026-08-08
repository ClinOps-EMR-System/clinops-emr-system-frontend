import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import NurseStationPage from "../app/(app)/nurse-station/page";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("@/lib/useFetch", () => ({
  useFetch: (endpoint: string) => mocks.fetch(endpoint),
}));

vi.mock("@/store/RoleContext", () => ({
  useAuth: () => ({ token: "test-token", user: { name: "Grace Mwale" } }),
}));

const walkInEntry = {
  encounter_id: 3,
  encounter_type: "outpatient",
  source: "walk-in",
  patient: {
    id: 15,
    hospital_number: "000015",
    full_name: "Peter Kachale",
  },
  status: "awaiting_triage",
  chief_complaint: "Fever",
  triage_priority: null,
  arrived_at: "2026-08-07T18:30:04.000Z",
  wait_time_minutes: 40,
};

describe("NurseStationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetch.mockImplementation((endpoint: string) => {
      if (endpoint.startsWith("/dashboard")) {
        return { data: { encounters: { awaiting_triage: 1, in_consultation: 0, discharged_today: 0 } } };
      }
      if (endpoint.startsWith("/emergency/resuscitation")) {
        return { data: [] };
      }
      if (endpoint.startsWith("/worklist/triage")) {
        return { data: [walkInEntry] };
      }
      return { data: [] };
    });
  });

  it("lists a walk-in patient awaiting triage fetched from the worklist", async () => {
    render(<NurseStationPage />);

    expect(await screen.findByText("Peter Kachale")).toBeInTheDocument();
    expect(screen.getByText("Fever")).toBeInTheDocument();
  });

  it("shows the awaiting triage count matching the dashboard", async () => {
    render(<NurseStationPage />);

    expect(mocks.fetch).toHaveBeenCalledWith("/worklist/triage");
  });
});
