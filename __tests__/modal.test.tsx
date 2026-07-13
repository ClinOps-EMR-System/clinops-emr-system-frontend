import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Modal from "../components/ui/Modal";

describe("Modal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: "Test Modal",
  };

  it("renders nothing when open is false", () => {
    const { container } = render(
      <Modal {...defaultProps} open={false}>
        <p>Content</p>
      </Modal>
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders title when open", () => {
    render(
      <Modal {...defaultProps}>
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(
      <Modal {...defaultProps} subtitle="Subtitle text">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText("Subtitle text")).toBeInTheDocument();
  });

  it("does not render subtitle when not provided", () => {
    render(
      <Modal {...defaultProps}>
        <p>Content</p>
      </Modal>
    );
    expect(screen.queryByText("Subtitle text")).not.toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <Modal {...defaultProps}>
        <p>Modal body content</p>
      </Modal>
    );
    expect(screen.getByText("Modal body content")).toBeInTheDocument();
  });

  it("renders footer when provided", () => {
    render(
      <Modal {...defaultProps} footer={<button>Save</button>}>
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal {...defaultProps} onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when overlay is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal {...defaultProps} onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    const overlay = container.querySelector(".fixed.inset-0.z-50") as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <Modal {...defaultProps} onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when non-Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <Modal {...defaultProps} onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("applies sm size class", () => {
    const { container } = render(
      <Modal {...defaultProps} size="sm">
        <p>Content</p>
      </Modal>
    );
    const dialog = container.querySelector(".max-w-md");
    expect(dialog).toBeInTheDocument();
  });

  it("applies xl size class", () => {
    const { container } = render(
      <Modal {...defaultProps} size="xl">
        <p>Content</p>
      </Modal>
    );
    const dialog = container.querySelector(".max-w-4xl");
    expect(dialog).toBeInTheDocument();
  });

  it("locks body scroll when open", () => {
    render(
      <Modal {...defaultProps}>
        <p>Content</p>
      </Modal>
    );
    expect(document.body.style.overflow).toBe("hidden");
  });
});
