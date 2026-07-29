"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SelectField from "@/components/ui/SelectField";

const genderOptions = [
  { value: "", label: "All Genders" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

const categoryOptions = [
  { value: "", label: "All Categories" },
  { value: "Outpatient", label: "Outpatient" },
  { value: "Inpatient", label: "Inpatient" },
  { value: "Emergency", label: "Emergency" },
  { value: "Student", label: "Student" },
  { value: "Staff", label: "Staff" },
];

interface PatientSearchToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  genderFilter: string;
  onGenderFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  incompleteFilter: boolean;
  onIncompleteFilterChange: (value: boolean) => void;
  onClear: () => void;
  hasFilters: boolean;
}

export default function PatientSearchToolbar({
  search,
  onSearchChange,
  genderFilter,
  onGenderFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  incompleteFilter,
  onIncompleteFilterChange,
  onClear,
  hasFilters,
}: PatientSearchToolbarProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, hospital #, national ID..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px]">
            <SelectField
              label="Gender"
              options={genderOptions}
              value={genderFilter}
              onChange={(e) => onGenderFilterChange(e.target.value)}
            />
          </div>

          <div className="min-w-[160px]">
            <SelectField
              label="Category"
              options={categoryOptions}
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer h-9 mt-5">
            <input
              type="checkbox"
              className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={incompleteFilter}
              onChange={(e) => onIncompleteFilterChange(e.target.checked)}
            />
            Incomplete Drafts Only
          </label>

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
