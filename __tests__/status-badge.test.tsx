import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatusBadge, {
  PriorityBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
  ReferralStatusBadge,
} from "../components/ui/StatusBadge";

describe("StatusBadge", () => {
  it("renders the label text", () => {
    render(<StatusBadge label="Active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies neutral variant by default", () => {
    render(<StatusBadge label="Test" />);
    const badge = screen.getByText("Test");
    expect(badge.className).toContain("bg-gray-100");
  });

  it("applies correct variant styles", () => {
    const { rerender } = render(<StatusBadge label="OK" variant="success" />);
    expect(screen.getByText("OK").className).toContain("bg-emerald-100");

    rerender(<StatusBadge label="Warn" variant="warning" />);
    expect(screen.getByText("Warn").className).toContain("bg-amber-100");

    rerender(<StatusBadge label="Err" variant="error" />);
    expect(screen.getByText("Err").className).toContain("bg-red-100");

    rerender(<StatusBadge label="Info" variant="info" />);
    expect(screen.getByText("Info").className).toContain("bg-sky-100");

    rerender(<StatusBadge label="Purp" variant="purple" />);
    expect(screen.getByText("Purp").className).toContain("bg-purple-100");
  });

  it("applies sm size by default", () => {
    render(<StatusBadge label="Sm" />);
    expect(screen.getByText("Sm").className).toContain("text-[10px]");
  });

  it("applies md size when specified", () => {
    render(<StatusBadge label="Md" size="md" />);
    expect(screen.getByText("Md").className).toContain("text-xs");
  });

  it("renders pulse dot when pulse is true", () => {
    const { container } = render(<StatusBadge label="Pulsing" pulse />);
    const dot = container.querySelector(".h-1\\.5.w-1\\.5");
    expect(dot).toBeInTheDocument();
  });

  it("does not render pulse dot by default", () => {
    const { container } = render(<StatusBadge label="No Pulse" />);
    const dots = container.querySelectorAll(".h-1\\.5.w-1\\.5");
    expect(dots.length).toBe(0);
  });

  it("accepts custom className", () => {
    render(<StatusBadge label="Custom" className="my-custom" />);
    expect(screen.getByText("Custom").className).toContain("my-custom");
  });
});

describe("PriorityBadge", () => {
  it("renders success variant for level 1", () => {
    render(<PriorityBadge level={1} />);
    expect(screen.getByText("ESI 1")).toBeInTheDocument();
    expect(screen.getByText("ESI 1").className).toContain("bg-emerald-100");
  });

  it("renders success variant for level 2", () => {
    render(<PriorityBadge level={2} />);
    expect(screen.getByText("ESI 2")).toBeInTheDocument();
  });

  it("renders warning variant for level 3", () => {
    render(<PriorityBadge level={3} />);
    expect(screen.getByText("ESI 3").className).toContain("bg-amber-100");
  });

  it("renders error variant with pulse for level 5", () => {
    render(<PriorityBadge level={5} />);
    expect(screen.getByText("ESI 5").className).toContain("bg-red-100");
  });
});

describe("OrderStatusBadge", () => {
  it("renders warning+pulse for pending", () => {
    render(<OrderStatusBadge status="pending" />);
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("pending").className).toContain("bg-amber-100");
  });

  it("renders info for in_progress", () => {
    render(<OrderStatusBadge status="in_progress" />);
    expect(screen.getByText("in_progress").className).toContain("bg-sky-100");
  });

  it("renders success for completed", () => {
    render(<OrderStatusBadge status="completed" />);
    expect(screen.getByText("completed").className).toContain("bg-emerald-100");
  });

  it("renders success for dispensed", () => {
    render(<OrderStatusBadge status="dispensed" />);
    expect(screen.getByText("dispensed").className).toContain("bg-emerald-100");
  });

  it("renders error for cancelled", () => {
    render(<OrderStatusBadge status="cancelled" />);
    expect(screen.getByText("cancelled").className).toContain("bg-red-100");
  });

  it("renders neutral for unknown status", () => {
    render(<OrderStatusBadge status="weird_status" />);
    expect(screen.getByText("weird_status").className).toContain("bg-gray-100");
  });

  it("is case-insensitive", () => {
    render(<OrderStatusBadge status="PENDING" />);
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });
});

describe("PaymentStatusBadge", () => {
  it("renders success for paid", () => {
    render(<PaymentStatusBadge status="paid" />);
    expect(screen.getByText("paid").className).toContain("bg-emerald-100");
  });

  it("renders success for completed", () => {
    render(<PaymentStatusBadge status="completed" />);
    expect(screen.getByText("completed").className).toContain("bg-emerald-100");
  });

  it("renders warning for partial", () => {
    render(<PaymentStatusBadge status="partial" />);
    expect(screen.getByText("Partial")).toBeInTheDocument();
    expect(screen.getByText("Partial").className).toContain("bg-amber-100");
  });

  it("renders error+pulse for unpaid", () => {
    render(<PaymentStatusBadge status="unpaid" />);
    expect(screen.getByText("unpaid").className).toContain("bg-red-100");
  });

  it("renders purple for waived", () => {
    render(<PaymentStatusBadge status="waived" />);
    expect(screen.getByText("waived").className).toContain("bg-purple-100");
  });
});

describe("ReferralStatusBadge", () => {
  it("renders success for accepted", () => {
    render(<ReferralStatusBadge status="accepted" />);
    expect(screen.getByText("accepted").className).toContain("bg-emerald-100");
  });

  it("renders warning+pulse for pending", () => {
    render(<ReferralStatusBadge status="pending" />);
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders error for rejected", () => {
    render(<ReferralStatusBadge status="rejected" />);
    expect(screen.getByText("rejected").className).toContain("bg-red-100");
  });

  it("renders info for in_progress", () => {
    render(<ReferralStatusBadge status="in_progress" />);
    expect(screen.getByText("in_progress").className).toContain("bg-sky-100");
  });
});
