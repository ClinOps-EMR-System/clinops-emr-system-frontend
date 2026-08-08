import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ImagingUploadModal from "../components/radiology/ImagingUploadModal";

const apiMock = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { post: apiMock.post } }));

const target = {
  imaging_request_id: 42,
  imaging_type: "X-Ray",
  body_site: "Chest",
  patient: { full_name: "Jane Doe" },
};

describe("ImagingUploadModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders title, subtitle, and the report fields", () => {
    render(<ImagingUploadModal open request={target} token="t" onClose={vi.fn()} />);
    expect(screen.getByText("Upload Results & Images")).toBeInTheDocument();
    expect(screen.getByText(/X-Ray — Chest · Jane Doe/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe the radiological findings/)).toBeInTheDocument();
  });

  it("shows an inline error and does not call the API when submitting without findings or impression", async () => {
    render(<ImagingUploadModal open request={target} token="t" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Upload Results & Release/ }));
    expect(await screen.findByText(/Findings and Impression are required/)).toBeInTheDocument();
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it("submits a FormData with images[] and report fields", async () => {
    apiMock.post.mockResolvedValue({});
    render(<ImagingUploadModal open request={target} token="t" onClose={vi.fn()} />);

    const file = new File(["img"], "chest.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText(/Click to select scan image files/), { target: { files: [file] } });

    fireEvent.change(screen.getByPlaceholderText(/Describe the radiological findings/), { target: { value: "Findings text" } });
    fireEvent.change(screen.getByPlaceholderText(/Radiologist's diagnostic impression/), { target: { value: "Impression text" } });
    fireEvent.click(screen.getByRole("button", { name: /Upload Results & Release/ }));

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1));
    const [url, body] = apiMock.post.mock.calls[0];
    expect(url).toBe("/imaging-requests/42/complete");
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("findings")).toBe("Findings text");
    expect(body.get("impression")).toBe("Impression text");
    expect(body.getAll("images[]")).toHaveLength(1);
  });

  it("shows a success message after a successful submit", async () => {
    apiMock.post.mockResolvedValue({});
    render(<ImagingUploadModal open request={target} token="t" onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Describe the radiological findings/), { target: { value: "F" } });
    fireEvent.change(screen.getByPlaceholderText(/Radiologist's diagnostic impression/), { target: { value: "I" } });
    fireEvent.click(screen.getByRole("button", { name: /Upload Results & Release/ }));
    expect(await screen.findByText(/Report submitted and released/)).toBeInTheDocument();
  });
});
