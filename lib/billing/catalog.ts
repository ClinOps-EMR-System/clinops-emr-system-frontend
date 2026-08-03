import type { BillableService, LoincCode } from "@/types/admin";

export interface AutoBilledSeed {
  code: string;
  name: string;
  category: string;
  billing_unit?: string;
}

export const AUTO_BILLED_SERVICES: AutoBilledSeed[] = [
  { code: "CONS-OPD", name: "OPD Consultation", category: "Consultation", billing_unit: "per_visit" },
  { code: "CONS-EMG", name: "Emergency Consultation", category: "Consultation", billing_unit: "per_visit" },
  { code: "CONS-INP", name: "Inpatient Consultation", category: "Consultation", billing_unit: "per_visit" },
  { code: "ADM-FEE", name: "Admission Fee", category: "Admission", billing_unit: "per_admission" },
  { code: "DIS-FEE", name: "Discharge Fee", category: "Admission", billing_unit: "per_discharge" },
];

export interface AutoBilledRow {
  seed: AutoBilledSeed;
  service: BillableService | null;
}

export function resolveAutoBilled(items: BillableService[]): AutoBilledRow[] {
  const byCode = new Map(items.map((s) => [s.code, s]));
  return AUTO_BILLED_SERVICES.map((seed) => ({
    seed,
    service: byCode.get(seed.code) ?? null,
  }));
}

export function loincToServiceFields(loinc: LoincCode): {
  code: string;
  name: string;
  category: string;
  billing_unit: string;
} {
  return {
    code: `LAB-${loinc.code}`,
    name: loinc.display_name,
    category: "Lab",
    billing_unit: "per_test",
  };
}

export function formatBillingUnit(unit?: string | null): string {
  if (!unit) return "—";
  const words = unit
    .replace(/^per_/, "")
    .split("_")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1));
  return `Per ${words.join(" ")}`;
}
