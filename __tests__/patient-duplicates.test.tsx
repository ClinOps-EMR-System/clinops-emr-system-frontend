import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PatientRegistrationForm from "../components/patients/PatientRegistrationForm";
import PatientProfilePage from "../app/(app)/patients/[id]/page";
import { ToastProvider } from "../components/ui/Toast";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  push: vi.fn(),
  searchParams: { get: vi.fn() },
  params: { id: "10" },
  user: { id: 1, permissions: ["patient.merge"] },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => mocks.searchParams,
  useParams: () => mocks.params,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: mocks.get,
    post: mocks.post,
    put: mocks.put,
  },
}));

vi.mock("@/store/RoleContext", () => ({
  useAuth: () => ({ token: "test-token", user: mocks.user }),
}));

const duplicateMatch = {
  id: 15,
  hospital_number: "000042",
  first_name: "Chikondi",
  last_name: "Banda",
  date_of_birth: "1990-05-15",
  gender: "Female",
  phone: "+265991234567",
  village: "Mabuka",
  district: "Zomba",
  score: 145,
  confidence: "High",
  match_reasons: ["same_name", "same_phone", "same_dob"],
};

function defaultPatient() {
  return {
    id: 10,
    hospital_number: "000041",
    first_name: "Chikondi",
    last_name: "Banda",
    date_of_birth: "1990-05-15",
    gender: "Female",
    phone: "+265991234567",
    patient_category: "Outpatient",
    village: "Mabuka",
    district: "Zomba",
    consent_care: true,
    consent_teaching: false,
    consent_research: false,
  };
}

describe("Duplicate detection on registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchParams.get.mockReturnValue(null);
    mocks.post.mockImplementation((endpoint: string) => {
      if (endpoint === "/patients/check-duplicates") {
        return Promise.resolve({
          data: { summary: { total: 1, high: 1, medium: 0, low: 0 }, matches: [duplicateMatch] },
        });
      }
      return Promise.resolve({ status: 201, data: { id: 99 } });
    });
  });

  it("surfaces ranked matches with confidence before creating a new card", async () => {
    render(
      <ToastProvider>
        <PatientRegistrationForm />
      </ToastProvider>
    );

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: "Chikondi" } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: "Banda" } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: "1990-05-15" } });

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.click(screen.getByLabelText(/Consent to Care/));
    fireEvent.click(screen.getByRole("button", { name: "Register Patient" }));

    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/patients/check-duplicates",
        expect.objectContaining({
          first_name: "Chikondi",
          last_name: "Banda",
          date_of_birth: "1990-05-15",
        }),
        "test-token"
      )
    );

    expect(await screen.findByText("Duplicate Records Detected")).toBeInTheDocument();
    expect(screen.getByText(/High · 145/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Yes, Save as New Patient" }));

    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith("/patients", expect.anything(), "test-token")
    );
    expect(mocks.post).not.toHaveBeenCalledWith(
      "/patients/check-duplicates",
      expect.objectContaining({ exclude_id: expect.anything() }),
      expect.anything()
    );
  });

  it("links an emergency visit to an existing record instead of creating a new card", async () => {
    mocks.searchParams.get.mockImplementation((key: string) => (key === "emergency" ? "true" : null));
    mocks.post.mockImplementation((endpoint: string) => {
      if (endpoint === "/patients/check-duplicates") {
        return Promise.resolve({
          data: { summary: { total: 1, high: 1, medium: 0, low: 0 }, matches: [duplicateMatch] },
        });
      }
      if (endpoint === "/emergency/register") {
        return Promise.resolve({
          status: 201,
          data: { patient: { ...defaultPatient(), id: 15 }, linked_patient: true },
        });
      }
      return Promise.resolve({ status: 201 });
    });

    render(
      <ToastProvider>
        <PatientRegistrationForm />
      </ToastProvider>
    );

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: "Chikondi" } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: "Banda" } });
    fireEvent.change(screen.getByLabelText(/Approximate Age/i), { target: { value: "35" } });
    fireEvent.change(screen.getByLabelText(/Presenting Complaint/i), { target: { value: "Chest pain" } });

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.click(screen.getByLabelText(/Consent to Care/i));
    fireEvent.click(screen.getByRole("button", { name: "Register for Triage" }));

    expect(await screen.findByText("Patient May Already Be Registered")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Link to This Record" }));

    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/emergency/register",
        expect.objectContaining({ existing_patient_id: 15 }),
        "test-token"
      )
    );
    expect(mocks.push).toHaveBeenCalledWith("/patients/15");
  });
});

describe("Duplicate merge on patient profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.permissions = ["patient.merge"];
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint === "/patients/10") {
        return Promise.resolve({ data: { patient: defaultPatient() } });
      }
      if (endpoint === "/patients/10/admissions") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
    mocks.post.mockImplementation((endpoint: string) => {
      if (endpoint === "/patients/check-duplicates") {
        return Promise.resolve({
          data: { summary: { total: 1, high: 1, medium: 0, low: 0 }, matches: [duplicateMatch] },
        });
      }
      if (endpoint === "/patients/merge") {
        return Promise.resolve({ status: 200, data: { primary: defaultPatient(), merged_fields: ["phone"] } });
      }
      return Promise.resolve({ status: 200 });
    });
  });

  it("is hidden without the patient.merge permission", async () => {
    mocks.user.permissions = ["something.else"];
    render(
      <ToastProvider>
        <PatientProfilePage />
      </ToastProvider>
    );
    await screen.findByText(/Chikondi Banda/);
    expect(screen.queryByText("Duplicate Resolution")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Find Duplicates" })).not.toBeInTheDocument();
  });

  it("finds duplicates excluding the current patient and merges the selected card", async () => {
    render(
      <ToastProvider>
        <PatientProfilePage />
      </ToastProvider>
    );

    const findButton = await screen.findByRole("button", { name: "Find Duplicates" });
    fireEvent.click(findButton);

    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/patients/check-duplicates",
        expect.objectContaining({ first_name: "Chikondi", last_name: "Banda", exclude_id: 10 }),
        "test-token"
      )
    );

    const mergeButton = await screen.findByRole("button", { name: "Merge Here" });
    fireEvent.click(mergeButton);

    expect(await screen.findByText("Merge Duplicate Record?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Merge Records" }));

    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/patients/merge",
        { primary_id: 10, duplicate_id: 15 },
        "test-token"
      )
    );
  });
});
