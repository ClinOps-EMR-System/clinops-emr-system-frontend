import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LabPage from "../app/(app)/lab/page";

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
  useAuth: () => ({ token: "test-token", user: { id: 1, roles: ["Lab Technician"] } }),
}));

const releasedResult = {
  id: 10,
  lab_request_id: 5,
  result_value_numeric: 13.5,
  result_value_text: null,
  unit: "g/dL",
  reference_range: "12-16",
  is_abnormal: false,
  is_critical: false,
  status: "released",
  verified_by: null,
  verified_at: null,
  released_at: "2026-08-06T08:38:21.000000Z",
  created_at: "2026-08-06T08:38:21.000000Z",
  lab_request: {
    id: 5,
    test_name: "CBC",
    loinc_code: "CBC001",
    patient_id: 1,
    encounter: {
      id: 2,
      patient_id: 1,
      patient: { first_name: "Chifundo", last_name: "Mwale", hospital_number: "000013" },
    },
  },
};

const enteredResult = {
  ...releasedResult,
  id: 11,
  status: "entered",
  released_at: null,
  created_at: "2026-08-06T09:00:00.000000Z",
};

const pendingOrder = {
  id: 1,
  patient_id: 1,
  encounter_id: 2,
  order_type: "lab",
  priority: "Routine",
  status: "Ordered",
  created_at: "2026-08-06T08:00:00.000000Z",
  patient: { first_name: "Chifundo", last_name: "Mwale", hospital_number: "000013" },
  lab_request: { id: 5, test_name: "CBC", loinc_code: "CBC001", specimen_type: null, status: "Ordered" },
};

describe("LabPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint === "/orders") {
        return Promise.resolve({ data: { data: [pendingOrder] } });
      }
      if (endpoint === "/lab-results") {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it("shows auto-released results under the results tab with a Released badge", async () => {
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint === "/orders") {
        return Promise.resolve({ data: { data: [pendingOrder] } });
      }
      if (endpoint === "/lab-results") {
        return Promise.resolve({ data: { data: [releasedResult] } });
      }
      return Promise.resolve({ data: [] });
    });

    render(<LabPage />);

    const tab = await screen.findByRole("tab", { name: /Verified Results/ });
    fireEvent.click(tab);

    expect(await screen.findByText("Chifundo Mwale")).toBeInTheDocument();
    expect(screen.getByText("Released")).toBeInTheDocument();
  });

  it("keeps entered results under results entry awaiting verification", async () => {
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint === "/orders") {
        return Promise.resolve({ data: { data: [pendingOrder] } });
      }
      if (endpoint === "/lab-results") {
        return Promise.resolve({ data: { data: [enteredResult] } });
      }
      return Promise.resolve({ data: [] });
    });

    render(<LabPage />);

    const tab = await screen.findByRole("tab", { name: /Results Entry/ });
    fireEvent.click(tab);

    expect(await screen.findByText("Chifundo Mwale")).toBeInTheDocument();
    expect(screen.getByText("Awaiting Verify")).toBeInTheDocument();
  });

  it("confirms release in the success message for lab technicians", async () => {
    mocks.post.mockResolvedValue({
      status: 201,
      message: "Result created successfully.",
      data: releasedResult,
    });

    render(<LabPage />);

    const enterButton = await screen.findByRole("button", { name: /Enter Result/ });
    fireEvent.click(enterButton);

    fireEvent.change(screen.getByPlaceholderText("e.g., 12.5, 120"), {
      target: { value: "13.5" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Submit Result/ }));

    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith(
        "/lab-results",
        expect.objectContaining({ lab_request_id: 5, result_value_numeric: 13.5 }),
        "test-token"
      );
    });

    expect(await screen.findByText(/released/i)).toBeInTheDocument();
    expect(screen.queryByText(/until verified/i)).not.toBeInTheDocument();
  });
});
