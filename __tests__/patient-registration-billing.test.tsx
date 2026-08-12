import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PatientRegistrationForm from "../components/patients/PatientRegistrationForm";
import { ToastProvider } from "../components/ui/Toast";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({
    get: (key: string) => (key === "edit" ? "5" : null),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: mocks.get,
    put: mocks.put,
    post: mocks.post,
  },
}));

vi.mock("@/store/RoleContext", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

describe("PatientRegistrationForm billing wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint.startsWith("/patients?search=")) {
        return Promise.resolve({ data: [] });
      }
      if (endpoint === "/patients/5") {
        return Promise.resolve({
          data: {
            patient: {
              id: 5,
              first_name: "Jane",
              last_name: "Doe",
              gender: "Female",
              date_of_birth: "1990-01-01",
              phone: "",
              national_id: null,
              health_passport_number: null,
              address: "",
              village: "",
              traditional_authority: "",
              district: "Zomba",
              guardian_name: null,
              guardian_phone: null,
              next_of_kin_relationship: null,
              insurance_provider: null,
              insurance_policy_number: null,
              preferred_language: "Chichewa",
              marital_status: null,
              occupation: null,
              referral_source: "Self",
              patient_category: "Outpatient",
              consent_care: true,
              consent_teaching: false,
              consent_research: false,
            },
          },
        });
      }
      return Promise.resolve({ data: null });
    });
    mocks.put.mockResolvedValue({
      status: 200,
      message: "Patient updated successfully.",
      data: { id: 5 },
      billing: {
        bill_id: 9,
        bill_number: "BLL202608030002",
        items_added: [
          { item_name: "Patient Registration", unit_price: "500.00", quantity: 1, total: "500.00" },
        ],
        running_total: "500.00",
        payment_status: "Unpaid",
      },
    });
  });

  it("never opens the billing modal on the edit path, even when the response carries a billing block", async () => {
    render(
      <ToastProvider>
        <PatientRegistrationForm />
      </ToastProvider>
    );

    expect(await screen.findByText("Edit Patient Profile")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.click(screen.getByRole("button", { name: "Register Patient" }));

    await waitFor(() =>
      expect(mocks.put).toHaveBeenCalledWith(
        "/patients/5",
        expect.objectContaining({ first_name: "Jane" }),
        "test-token"
      )
    );

    expect(mocks.push).toHaveBeenCalledWith("/patients/5");
    expect(screen.queryByText("Charges Added to Bill")).not.toBeInTheDocument();
  });
});
