import { describe, expect, it } from "vitest";
import {
  AUTO_BILLED_SERVICES,
  loincToServiceFields,
  resolveAutoBilled,
} from "../lib/billing/catalog";
import type { BillableService, LoincCode } from "../types/admin";

function service(code: string, name: string, category: string): BillableService {
  return { id: 1, code, name, category, unit_price: 0 };
}

describe("resolveAutoBilled", () => {
  it("returns one row per seeded service, in seed order", () => {
    const rows = resolveAutoBilled([]);
    expect(rows).toHaveLength(AUTO_BILLED_SERVICES.length);
    expect(rows.map((r) => r.seed.code)).toEqual(AUTO_BILLED_SERVICES.map((s) => s.code));
  });

  it("matches loaded services to seeds by code", () => {
    const rows = resolveAutoBilled([
      service("CONS-OPD", "OPD Consultation", "Consultation"),
      service("ADM-FEE", "Admission Fee", "Misc"),
    ]);
    expect(rows.find((r) => r.seed.code === "CONS-OPD")?.service).not.toBeNull();
    expect(rows.find((r) => r.seed.code === "ADM-FEE")?.service).not.toBeNull();
  });

  it("sets service to null for seeds missing from the loaded list", () => {
    const rows = resolveAutoBilled([]);
    expect(rows.find((r) => r.seed.code === "CONS-OPD")?.service).toBeNull();
  });
});

describe("loincToServiceFields", () => {
  it("maps a LOINC result to LAB-<code>, display_name, and Lab category", () => {
    const loinc: LoincCode = {
      code: "718-7",
      display_name: "Hemoglobin",
      component_name: "Hgb",
      system: "Bld",
    };
    expect(loincToServiceFields(loinc)).toEqual({
      code: "LAB-718-7",
      name: "Hemoglobin",
      category: "Lab",
      billing_unit: "per_test",
    });
  });
});
