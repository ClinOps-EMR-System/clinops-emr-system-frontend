"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SelectField from "@/components/ui/SelectField";

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "Admitted", label: "Admitted" },
  { value: "Transferred", label: "Transferred" },
  { value: "Discharged", label: "Discharged" },
];

const acuityOptions = [
  { value: "", label: "All Acuity" },
  { value: "Critical", label: "Critical" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const typeOptions = [
  { value: "", label: "All Types" },
  { value: "Emergency", label: "Emergency" },
  { value: "Elective", label: "Elective" },
];

interface AdmissionsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  acuityFilter: string;
  onAcuityFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  onClear: () => void;
  hasFilters: boolean;
}

export default function AdmissionsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  acuityFilter,
  onAcuityFilterChange,
  typeFilter,
  onTypeFilterChange,
  onClear,
  hasFilters,
}: AdmissionsToolbarProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by patient name or hospital #..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px]">
            <SelectField
              label="Status"
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
            />
          </div>

          <div className="min-w-[140px]">
            <SelectField
              label="Acuity"
              options={acuityOptions}
              value={acuityFilter}
              onChange={(e) => onAcuityFilterChange(e.target.value)}
            />
          </div>

          <div className="min-w-[140px]">
            <SelectField
              label="Type"
              options={typeOptions}
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
            />
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              onClick={onClear}
              className="text-destructive hover:text-destructive/80 h-9 mt-5"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
