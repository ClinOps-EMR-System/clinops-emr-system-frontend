import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import ConsultationPage from "../app/(app)/patients/[id]/consultation/page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, back: vi.fn() }),
  useParams: () => ({ id: "1" }),
}));

vi.mock("@/lib/api", () => ({
  api: { get: mocks.get, post: mocks.post },
}));

vi.mock("@/store/RoleContext", () => ({
  useAuth: () => ({ token: "test-token", user: { roles: ["Admin"], permissions: [] } }),
}));

vi.mock("@/store/RealtimeContext", () => ({
  useRealtime: () => ({ subscribe: vi.fn() }),
}));

vi.mock("@/store/LabResultBus", () => ({
  useLabResultBus: () => ({ openResult: vi.fn() }),
}));

describe("ConsultationPage LOINC order", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint === "/patients/1") {
        return Promise.resolve({ data: { patient: { id: 1, full_name: "Test Patient" } } });
      }
      if (endpoint === "/patients/1/triage") {
        return Promise.resolve({
          data: {
            encounter: { id: 2, status: "in_consultation", chief_complaint: null, history_of_present_illness: null, allergy_confirmed_at: null },
            allergies_confirmed: true,
            allergies: [],
            pregnancy_status: false,
            current_medications: [],
            vital_signs: {},
          },
        });
      }
      if (endpoint === "/diagnoses") {
        return Promise.resolve({ data: [] });
      }
      if (endpoint === "/orders?patient_id=1&encounter_id=2") {
        return Promise.resolve({ data: [] });
      }
      if (endpoint === "/prescriptions?encounter_id=2") {
        return Promise.resolve({ data: [] });
      }
      if (endpoint === "/encounters/2/consultation") {
        return Promise.resolve({ data: {} });
      }
      if (endpoint === "/alerts?encounter_id=2") {
        return Promise.resolve({ data: [] });
      }
      if (endpoint === "/patients/1/vital-signs/trends?days=7") {
        return Promise.resolve({ data: [] });
      }
      if (endpoint === "/loinc/search?q=hemo") {
        return Promise.resolve({
          data: [
            {
              id: 1,
              code: "882-1",
              display_name: "Hemoglobin [Mass/volume] in Blood",
              component_name: "Hemoglobin",
              system: "Bld",
              units: [{ unit_id: 1, unit_name: "g/dL", primary: true }],
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });
    mocks.post.mockResolvedValue({
      status: 201,
      message: "Order placed.",
      data: { id: 99 },
    });
  });

  it("searches LOINC tests as the user types in the Orders tab", async () => {
    render(<ToastProvider><ConsultationPage /></ToastProvider>);

    fireEvent.click(await screen.findByRole("button", { name: /^Orders/ }));

    const input = await screen.findByLabelText(/LOINC Test/i);
    fireEvent.change(input, { target: { value: "hemo" } });

    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/loinc/search?q=hemo", "test-token"));
    expect(await screen.findByText("Hemoglobin [Mass/volume] in Blood")).toBeInTheDocument();
  });

  it("places a lab order with the selected LOINC code", async () => {
    render(<ToastProvider><ConsultationPage /></ToastProvider>);

    fireEvent.click(await screen.findByRole("button", { name: /^Orders/ }));

    const input = await screen.findByLabelText(/LOINC Test/i);
    fireEvent.change(input, { target: { value: "hemo" } });
    fireEvent.click(await screen.findByText("Hemoglobin [Mass/volume] in Blood"));

    fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/encounters/2/orders",
        expect.objectContaining({
          patient_id: 1,
          order_type: "lab",
          loinc_code: "882-1",
          test_name: "Hemoglobin [Mass/volume] in Blood",
          priority: "routine",
        }),
        "test-token",
      ),
    );
  });
});
