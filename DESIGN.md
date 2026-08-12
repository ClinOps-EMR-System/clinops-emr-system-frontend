---
name: ClinOps EMR
description: Clinical green, Inter, dense product UI for hospital EMR and System Admin
colors:
  clinical-bg: "#fcf9f8"
  clinical-primary: "#0d7c3f"
  clinical-primary-hover: "#0a6332"
  clinical-primary-deep: "#006e17"
  clinical-surface: "#ffffff"
  clinical-outline: "#becab7"
  clinical-text: "#1b1c1c"
  clinical-muted: "#5f5e5e"
  clinical-error: "#ba1a1a"
  brand-green: "#22c55e"
  success: "#0d7c3f"
  brand-dark: "#18181b"
typography:
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  heading:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.clinical-primary}"
    textColor: "{colors.clinical-surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.clinical-primary-hover}"
    textColor: "{colors.clinical-surface}"
  surface-card:
    backgroundColor: "{colors.clinical-surface}"
    textColor: "{colors.clinical-text}"
    rounded: "{rounded.lg}"
---

## Overview

ClinOps uses a restrained clinical green palette on a near-white canvas. Product UI (clinical EMR and System Admin) shares tokens; the admin shell is a separate layout with denser tables and permission-gated nav, not a new brand.

## Colors

Primary actions and focus use clinical green (`#0d7c3f` / `#006e17`). Backgrounds stay `#fcf9f8` with white surfaces and sage outlines (`#becab7`). Errors use `#ba1a1a`. Accent is reserved for selection and primary CTAs — not decoration.

## Typography

Inter for all UI. Fixed rem scale (product register): body ~14px, page titles ~20px semibold, labels 13px medium. Monospace only for IDs and emails in tables.

## Elevation

Minimal shadows. Separation via borders (`clinical-outline` / shadcn border) and surface contrast. Sidebars use a slightly cooler tinted neutral (`--sidebar`). Prefer sheets/drawers over heavy modal stacks for admin forms.

## Components

shadcn (base-nova / mist) + ClinOps wrappers: `SectionHeader`, `StatusBadge`, `EmptyState`, `DataTable`, ConfirmDialog. Buttons: solid primary green, outline secondary, destructive red. Tables are the default list pattern; permission matrices use grouped checkboxes. Loading: skeletons. Empty states teach the next action.

## Do's and Don'ts

**Do:** Reuse clinical tokens in `/system` admin; gate by permission strings; dense operational layouts; 150–250ms state transitions.

**Don't:** Assign Admin role from the UI; purple gradients; glass cards; hero-metric SaaS grids; display fonts; side-stripe accent borders; public signup as staff provisioning.
