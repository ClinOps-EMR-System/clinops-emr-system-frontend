import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LabResultsPanel from "../components/consultation/LabResultsPanel";

const mocks = vi.hoisted(() => ({
  results: [] as unknown[],
  loading: false,
  error: null as string | null,
  refetch: vi.fn(),
}));

vi.mock("@/hooks/useLabResults", () => ({
  useLabResults: () => ({
    results: mocks.results,
    loading: mocks.loading,
    error: mocks.error,
    refetch: mocks.refetch,
  }),
}));

const base = {
  id: 1,
  lab_request_id: 5,
  result_value_numeric: 13.5,
  result_value_text: null,
  unit: "g/dL",
  reference_range: "12-16",
  is_abnormal: false,
  is_critical: false,
  status: "released",
  released_at: "2026-08-06T08:38:21.000000Z",
  released_by: { id: 3, name: "Dr. Owen Banda" },
  lab_request: { id: 5, test_name: "CBC", loinc_code: "CBC001", status: "Completed" },
};

describe("LabResultsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.results = [];
    mocks.loading = false;
    mocks.error = null;
  });

  it("renders released results with value, unit, reference range, and released meta", () => {
    mocks.results = [base];
    render(<LabResultsPanel encounterId={2} token="t" pendingCount={0} />);
    expect(screen.getByText("CBC")).toBeInTheDocument();
    expect(screen.getByText("13.5 g/dL")).toBeInTheDocument();
    expect(screen.getByText("(12-16)")).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Owen Banda/)).toBeInTheDocument();
  });

  it("shows the pending count line when pendingCount > 0", () => {
    mocks.results = [base];
    render(<LabResultsPanel encounterId={2} token="t" pendingCount={2} />);
    expect(screen.getByText(/2 tests still in progress/)).toBeInTheDocument();
  });

  it("shows an empty state when there are no results", () => {
    render(<LabResultsPanel encounterId={2} token="t" pendingCount={0} />);
    expect(screen.getByText(/No results released yet/)).toBeInTheDocument();
  });

  it("shows Abnormal and Critical badges", () => {
    mocks.results = [
      { ...base, id: 2, result_value_numeric: 18.2, is_abnormal: true, lab_request: { ...base.lab_request, test_name: "Glucose" } },
      { ...base, id: 3, result_value_numeric: 0.8, is_abnormal: true, is_critical: true, lab_request: { ...base.lab_request, test_name: "Sodium" } },
    ];
    render(<LabResultsPanel encounterId={2} token="t" pendingCount={0} />);
    expect(screen.getByText("Abnormal")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("refresh button triggers refetch", () => {
    render(<LabResultsPanel encounterId={2} token="t" pendingCount={0} />);
    fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it("disables the refresh button while loading", () => {
    mocks.loading = true;
    render(<LabResultsPanel encounterId={2} token="t" pendingCount={0} />);
    expect(screen.getByRole("button", { name: /Refresh/ })).toBeDisabled();
  });

  it("shows the error message with a retry button", () => {
    mocks.error = "Failed to load lab results";
    render(<LabResultsPanel encounterId={2} token="t" pendingCount={0} />);
    expect(screen.getByText("Failed to load lab results")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));
    expect(mocks.refetch).toHaveBeenCalled();
  });
});
