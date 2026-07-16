import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/primitive", () => {
  const { twMerge } = require("tailwind-merge");
  return {
    cx: (...args: unknown[]) => {
      const flat = args.flat(Infinity).filter(
        (a) => typeof a === "string" && a.length > 0
      );
      return twMerge(...flat);
    },
  };
});

import { StatCard } from "../components/ui/stat-card";

describe("StatCard", () => {
  it("renders with correct label and value", () => {
    render(<StatCard label="Patients" value={42} />);
    expect(screen.getByText("Patients")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders number values with locale formatting", () => {
    render(<StatCard label="Count" value={1000} />);
    expect(screen.getByText("1,000")).toBeInTheDocument();
  });

  it("renders string values as-is", () => {
    render(<StatCard label="Status" value="N/A" />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("shows skeleton when loading", () => {
    const { container } = render(<StatCard label="Loading" value={0} loading />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(2);
  });

  it("renders icon when provided", () => {
    const Icon = ({ className }: { className?: string }) => (
      <svg className={className} data-testid="test-icon" />
    );
    render(<StatCard label="With Icon" value={5} icon={Icon} />);
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });

  it("does not render icon when not provided", () => {
    render(<StatCard label="No Icon" value={5} />);
    expect(screen.queryByTestId("test-icon")).not.toBeInTheDocument();
  });

  it("renders trend indicator with up direction", () => {
    render(
      <StatCard label="Trend" value={10} trend={{ value: 12, direction: "up" }} />
    );
    expect(screen.getByText("12%")).toBeInTheDocument();
  });

  it("renders trend indicator with down direction", () => {
    render(
      <StatCard label="Trend" value={10} trend={{ value: 5, direction: "down" }} />
    );
    expect(screen.getByText("5%")).toBeInTheDocument();
  });

  it("applies variant color when value is a number greater than 0", () => {
    const { container } = render(
      <StatCard label="Warning" value={3} color="warning" />
    );
    const dd = container.querySelector("dd");
    expect(dd?.className).toContain("text-amber-600");
  });

  it("falls back to default text color when value is 0", () => {
    const { container } = render(
      <StatCard label="Zero" value={0} color="warning" />
    );
    const dd = container.querySelector("dd");
    expect(dd?.className).toContain("text-[#1b1c1c]");
  });

  it("falls back to default text color when value is a string", () => {
    const { container } = render(
      <StatCard label="String" value="none" color="danger" />
    );
    const dd = container.querySelector("dd");
    expect(dd?.className).toContain("text-[#1b1c1c]");
  });

  it("applies custom className to root element only", () => {
    const { container } = render(
      <StatCard label="Custom" value={1} className="my-custom" />
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("my-custom");
    const dd = container.querySelector("dd");
    expect(dd?.className).not.toContain("my-custom");
  });
});
