import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ResuscitationPage from "../app/(app)/resuscitation/page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: mocks.get,
    post: mocks.post,
  },
}));

vi.mock("@/store/RoleContext", () => ({
  useAuth: () => ({ token: "test-token", user: { name: "Dr. Test" } }),
}));

const patient = {
  id: 1,
  encounter_id: 2,
  patient: { id: 15, hospital_number: "000015", full_name: "Peter Kachale", gender: "M" },
  severity_level: 1,
  chief_complaint: "Cardiac arrest",
  team_lead: null,
  activated_at: "2026-08-08T10:00:00.000Z",
  wait_minutes: 12,
  last_reassessed_at: null,
  minutes_since_reassess: null,
  airway_intervention: null,
  breathing_intervention: null,
  circulation_intervention: null,
  rhythm: null,
  medications_given: [],
  outcome: "in_progress",
};

describe("ResuscitationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint === "/resuscitation") {
        return Promise.resolve({ data: { data: [patient] } });
      }
      if (endpoint === "/resuscitation/team-leads") {
        return Promise.resolve({ data: { data: [{ id: 5, name: "Dr. Memory Kazembe" }] } });
      }
      return Promise.resolve({ data: null });
    });
    mocks.post.mockResolvedValue({ data: { data: {} } });
  });

  it("lists team leads from the resuscitation endpoint in the activate modal", async () => {
    render(<ResuscitationPage />);

    await screen.findByText("Peter Kachale");

    fireEvent.click(screen.getByRole("button", { name: "Activate" }));

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Dr. Memory Kazembe" })).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith("/resuscitation/team-leads", "test-token");
  });
});
