import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EmptyState from "../components/ui/EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="No results" description="Try adjusting your filters." />);
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Try adjusting your filters.")).toBeInTheDocument();
  });

  it("renders default FileText icon when no icon prop provided", () => {
    const { container } = render(<EmptyState title="Empty" description="Nothing here" />);
    const iconContainer = container.querySelector(".h-12.w-12");
    expect(iconContainer).toBeInTheDocument();
  });

  it("renders custom icon when provided", () => {
    render(
      <EmptyState
        title="No data"
        description="No records found."
        icon={<span data-testid="custom-icon">star</span>}
      />
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("renders action element when provided", () => {
    render(
      <EmptyState
        title="Empty"
        description="Nothing to show."
        action={<button>Add Item</button>}
      />
    );
    expect(screen.getByText("Add Item")).toBeInTheDocument();
  });

  it("does not render action when not provided", () => {
    render(<EmptyState title="Empty" description="Nothing" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
