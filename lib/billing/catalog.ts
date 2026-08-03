import type { BillableService, LoincCode } from "@/types/admin";

export interface AutoBilledSeed {
  code: string;
  name: string;
  category: string;
}

export const AUTO_BILLED_SERVICES: AutoBilledSeed[] = [
  { code: "CONS-OPD", name: "OPD Consultation", category: "Consultation" },
  { code: "CONS-EMG", name: "Emergency Consultation", category: "Consultation" },
  { code: "CONS-INP", name: "Inpatient Consultation", category: "Consultation" },
  { code: "ADM-FEE", name: "Admission Fee", category: "Misc" },
  { code: "DIS-FEE", name: "Discharge Fee", category: "Misc" },
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
} {
  return {
    code: `LAB-${loinc.code}`,
    name: loinc.display_name,
    category: "Lab",
  };
}
