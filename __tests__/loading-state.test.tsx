import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LoadingState from "../components/ui/LoadingState";

describe("LoadingState", () => {
  it("renders default message", () => {
    render(<LoadingState />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders custom message", () => {
    render(<LoadingState message="Fetching data..." />);
    expect(screen.getByText("Fetching data...")).toBeInTheDocument();
  });

  it("renders inline layout by default", () => {
    const { container } = render(<LoadingState />);
    const wrapper = container.querySelector(".flex.items-center.gap-3.p-4");
    expect(wrapper).toBeInTheDocument();
  });

  it("renders fullPage layout when fullPage is true", () => {
    const { container } = render(<LoadingState fullPage />);
    const wrapper = container.querySelector(".flex.items-center.justify-center.h-64");
    expect(wrapper).toBeInTheDocument();
  });

  it("renders spinner element", () => {
    const { container } = render(<LoadingState />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});
