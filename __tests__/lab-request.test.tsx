import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import NewLabRequestPage from "../app/(app)/lab/request/page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, back: vi.fn() }),
  useSearchParams: () => ({
    get: (key: string) => (key === "patient_id" ? "1" : key === "encounter_id" ? "2" : null),
  }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: mocks.get,
    post: mocks.post,
  },
}));

vi.mock("@/store/RoleContext", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

describe("NewLabRequestPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint.startsWith("/patients/") && endpoint.endsWith("/encounters")) {
        return Promise.resolve({
          data: [
            { id: 2, status: "Active", encounter_type: "OPD", created_at: "2026-08-01T00:00:00Z" },
          ],
        });
      }
      if (endpoint.startsWith("/lab-tests")) {
        return Promise.resolve({
          data: [
            {
              id: 9,
              code: "718-7",
              name: "Hemoglobin",
              category_id: 1,
              specimen_type_id: null,
              description: null,
              result_type: "SINGLE",
              is_panel: false,
              loinc_code: "718-7",
              active: true,
              category: { id: 1, name: "Haematology", code: "HAEM", display_order: 1, active: true },
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });
    mocks.post.mockResolvedValue({
      status: 201,
      message: "Lab request created successfully.",
      data: { id: 55 },
      billing: {
        bill_id: 12,
        bill_number: "BLL202608030001",
        items_added: [
          { item_name: "Hemoglobin", unit_price: "1500.00", quantity: 1, total: "1500.00" },
        ],
        running_total: "1500.00",
        payment_status: "Unpaid",
      },
    });
  });

  it("renders the form and loads the patient's encounters", async () => {
    render(<ToastProvider><NewLabRequestPage /></ToastProvider>);

    expect(screen.getByRole("heading", { name: "New Lab Request" })).toBeInTheDocument();
    expect(screen.getByText(/Patient #1/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "" })).toBeInTheDocument();
    });
    expect(mocks.get).toHaveBeenCalledWith("/patients/1/encounters", "test-token");
  });

  it("submits a lab request and shows the billing confirmation modal", async () => {
    render(<ToastProvider><NewLabRequestPage /></ToastProvider>);

    await waitFor(() => expect(screen.getAllByRole("combobox").length).toBe(2));
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "2" } });

    fireEvent.change(screen.getByPlaceholderText(/Search by test name/), {
      target: { value: "hemo" },
    });

    const resultButton = await screen.findByRole("button", { name: /Hemoglobin/ });
    fireEvent.click(resultButton);
    expect(screen.getByText("Haematology")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Create Lab Request/ }));

    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith(
        "/lab-requests",
        expect.objectContaining({
          encounter_id: 2,
          lab_test_id: 9,
          priority: "Routine",
        }),
        "test-token"
      );
    });

    expect(await screen.findByText("Charges Added to Bill")).toBeInTheDocument();
    expect(screen.getByText("Bill BLL202608030001")).toBeInTheDocument();
    expect(screen.getByText("Unpaid")).toBeInTheDocument();
  });

  it("navigates to the lab page when Done is pressed", async () => {
    render(<ToastProvider><NewLabRequestPage /></ToastProvider>);

    await waitFor(() => expect(screen.getAllByRole("combobox").length).toBe(2));
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "2" } });
    fireEvent.change(screen.getByPlaceholderText(/Search by test name/), {
      target: { value: "hemo" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Hemoglobin/ }));

    fireEvent.click(screen.getByRole("button", { name: /Create Lab Request/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Done" }));

    expect(mocks.push).toHaveBeenCalledWith("/lab");
  });

  it("falls back to the success toast and navigation when the response has no billing block", async () => {
    mocks.post.mockResolvedValue({
      status: 201,
      message: "Lab request created successfully.",
      data: { id: 56 },
    });

    render(<ToastProvider><NewLabRequestPage /></ToastProvider>);

    await waitFor(() => expect(screen.getAllByRole("combobox").length).toBe(2));
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "2" } });
    fireEvent.change(screen.getByPlaceholderText(/Search by test name/), {
      target: { value: "hemo" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Hemoglobin/ }));

    fireEvent.click(screen.getByRole("button", { name: /Create Lab Request/ }));

    expect(await screen.findByText(/Lab request created successfully/)).toBeInTheDocument();
    expect(screen.queryByText("Charges Added to Bill")).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/lab"), { timeout: 3000 });
  });
});
