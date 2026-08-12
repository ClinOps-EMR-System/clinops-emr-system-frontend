"use client";

import { useState } from "react";
import { useAuth } from "../../../../store/RoleContext";
import { adminApi } from "../../../../lib/services/admin";
import { SectionHeader } from "../../../../components/ui/PageLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SelectField from "../../../../components/ui/SelectField";
import {
  FlaskConical,
  Download,
  Shield,
  AlertTriangle,
  FileText,
  Check,
} from "lucide-react";
import { RoleGuard } from "@/components/auth/RoleGuard";

const AVAILABLE_FIELDS = [
  { group: "Demographics", fields: [
    { value: "hospital_number", label: "Hospital Number" },
    { value: "date_of_birth", label: "Date of Birth (shifted)" },
    { value: "gender", label: "Gender" },
    { value: "patient_category", label: "Patient Category" },
    { value: "district", label: "District" },
    { value: "ta", label: "Traditional Authority" },
  ]},
  { group: "De-Identified PHI (hashed)", fields: [
    { value: "first_name", label: "First Name (HMAC)" },
    { value: "last_name", label: "Last Name (HMAC)" },
    { value: "phone", label: "Phone (HMAC)" },
    { value: "national_id", label: "National ID (HMAC)" },
    { value: "address", label: "Address (HMAC)" },
    { value: "village", label: "Village (HMAC)" },
    { value: "guardian_name", label: "Guardian Name (HMAC)" },
    { value: "guardian_phone", label: "Guardian Phone (HMAC)" },
  ]},
];

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "OPD", label: "OPD" },
  { value: "IPD", label: "IPD" },
  { value: "Emergency", label: "Emergency" },
];

export default function ResearchDataPage() {
  const { token } = useAuth();
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [selectedFields, setSelectedFields] = useState<string[]>([
    "hospital_number", "date_of_birth", "gender", "patient_category", "district",
  ]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [department, setDepartment] = useState("");
  const [patientCategory, setPatientCategory] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const toggleAllInGroup = (fields: string[]) => {
    const allSelected = fields.every((f) => selectedFields.includes(f));
    if (allSelected) {
      setSelectedFields((prev) => prev.filter((f) => !fields.includes(f)));
    } else {
      setSelectedFields((prev) => [...new Set([...prev, ...fields])]);
    }
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      setError("Select at least one field to export");
      return;
    }
    setExporting(true);
    setError(null);
    setSuccess(false);
    try {
      const filters: Record<string, string> = {};
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (department) filters.department = department;
      if (patientCategory) filters.patient_category = patientCategory;

      await adminApi.exportResearchData(token, {
        format,
        fields: selectedFields,
        filters,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["admin", "clinical admin"]}>
      <div className="flex flex-col gap-6">
        <SectionHeader
          title="Research Data Export"
          description="Export de-identified patient data for research purposes"
        />

        {/* Info Banner */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Data De-Identification</p>
                <p className="text-blue-700 mt-1">
                  Exported data is automatically de-identified: PHI fields are HMAC-SHA256 hashed,
                  dates of birth are shifted per-patient (±30 days), and only patients with
                  <code className="mx-1 px-1 py-0.5 bg-blue-100 rounded text-xs">consent_research=true</code>
                  are included.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            Export completed successfully. Check your downloads.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Field Selection */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  Select Fields to Export
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {AVAILABLE_FIELDS.map((group) => {
                  const allSelected = group.fields.every((f) => selectedFields.includes(f.value));
                  const someSelected = group.fields.some((f) => selectedFields.includes(f.value));
                  return (
                    <div key={group.group}>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected && !allSelected;
                          }}
                          onChange={() => toggleAllInGroup(group.fields.map((f) => f.value))}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {group.group}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 ml-6">
                        {group.fields.map((field) => (
                          <label
                            key={field.value}
                            className="flex items-center gap-2 text-sm py-1 cursor-pointer hover:text-foreground text-muted-foreground"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFields.includes(field.value)}
                              onChange={() => toggleField(field.value)}
                              className="h-3.5 w-3.5 rounded border-gray-300"
                            />
                            {field.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground pt-2">
                  {selectedFields.length} field{selectedFields.length !== 1 ? "s" : ""} selected
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Export Configuration */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Download className="h-4 w-4" />
                  Export Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Format</label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={format === "csv" ? "default" : "outline"}
                      onClick={() => setFormat("csv")}
                    >
                      CSV
                    </Button>
                    <Button
                      size="sm"
                      variant={format === "json" ? "default" : "outline"}
                      onClick={() => setFormat("json")}
                    >
                      JSON
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Patient Category</label>
                  <SelectField
                    label=""
                    options={CATEGORY_OPTIONS}
                    value={patientCategory}
                    onChange={(e) => setPatientCategory(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Department</label>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Internal Medicine"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Date From</label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Date To</label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </div>

                <Button
                  onClick={handleExport}
                  disabled={exporting || selectedFields.length === 0}
                  className="w-full"
                >
                  <Download className="h-4 w-4" data-icon="inline-start" />
                  {exporting ? "Exporting..." : `Export ${format.toUpperCase()}`}
                </Button>
              </CardContent>
            </Card>

            {/* De-identification Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FlaskConical className="h-4 w-4" />
                  What Gets De-Identified
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">HMAC-SHA256 hashed:</strong> names, phone, national ID, address, village, guardian info</p>
                <p><strong className="text-foreground">Date shifted:</strong> date of birth is shifted ±30 days per patient (consistent per patient, different between patients)</p>
                <p><strong className="text-foreground">Consent-gated:</strong> only patients with research consent enabled are included</p>
                <p><strong className="text-foreground">Preserved:</strong> hospital number, gender, age group, district, TA, patient category</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
