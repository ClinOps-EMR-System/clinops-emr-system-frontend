"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  MessageSquare,
  User,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import { Patient } from "@/types/patient";

type SortKey = "first_name" | "hospital_number" | "date_of_birth";
type SortDir = "asc" | "desc";

interface SortState {
  key: SortKey;
  dir: SortDir;
}

function getSortableValue(patient: Patient, key: SortKey): string {
  return patient[key] ?? "";
}

function getClinicalStatus(
  patient: Patient
): { label: string; variant: "success" | "warning" | "error" | "info" | "neutral" | "purple"; pulse?: boolean } {
  if (!patient.registration_completed_at) {
    return { label: "Draft", variant: "warning", pulse: true };
  }

  const encounter = patient.encounters?.[0];
  if (!encounter) {
    return { label: "Registered", variant: "neutral" };
  }

  switch (encounter.status) {
    case "Checked-in":
    case "Emergency":
    case "awaiting_triage":
      return { label: "In Triage", variant: "warning", pulse: true };
    case "resuscitation":
      return { label: "Resuscitation", variant: "error", pulse: true };
    case "waiting_for_clinician":
    case "Triage Complete":
      return { label: "Triaged", variant: "info" };
    case "In Consultation":
    case "in_consultation":
      return { label: "In Consult", variant: "purple" };
    case "Completed":
    case "discharged":
      return { label: "Completed", variant: "success" };
    case "Discharged":
      return { label: "Discharged", variant: "success" };
    default:
      return { label: encounter.status, variant: "neutral" };
  }
}

interface ActionConfig {
  href: string;
  label: string;
  icon: typeof Stethoscope;
  iconColor: string;
}

function getPrimaryAction(patient: Patient): ActionConfig {
  if (!patient.registration_completed_at) {
    return {
      href: `/patients/register?complete=${patient.id}`,
      label: "Complete",
      icon: ClipboardCheck,
      iconColor: "text-sky-600",
    };
  }

  const encounter = patient.encounters?.[0];
  if (!encounter) {
    return {
      href: `/patients/${patient.id}/triage`,
      label: "Triage",
      icon: Stethoscope,
      iconColor: "text-clinical-primary",
    };
  }

  switch (encounter.status) {
    case "Checked-in":
    case "Emergency":
    case "awaiting_triage":
    case "resuscitation":
      return {
        href: `/patients/${patient.id}/triage`,
        label: "Resume Triage",
        icon: Stethoscope,
        iconColor: "text-clinical-primary",
      };
    case "waiting_for_clinician":
    case "Triage Complete":
      return {
        href: `/patients/${patient.id}/consultation`,
        label: "Consult",
        icon: MessageSquare,
        iconColor: "text-teal-600",
      };
    case "In Consultation":
    case "in_consultation":
      return {
        href: `/patients/${patient.id}/consultation`,
        label: "Resume Consult",
        icon: MessageSquare,
        iconColor: "text-teal-600",
      };
    case "Completed":
    case "Discharged":
    case "discharged":
    default:
      return {
        href: `/patients/${patient.id}`,
        label: "View",
        icon: ArrowRight,
        iconColor: "text-muted-foreground",
      };
  }
}

function SortIcon({ sort, columnKey }: { sort: SortState; columnKey: SortKey }) {
  if (sort.key !== columnKey) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40" />;
  return sort.dir === "asc" ? (
    <ChevronUp className="h-3 w-3 text-foreground/60" />
  ) : (
    <ChevronDown className="h-3 w-3 text-foreground/60" />
  );
}

function SortableHead({ sort, onToggle, columnKey, children }: {
  sort: SortState;
  onToggle: (key: SortKey) => void;
  columnKey: SortKey;
  children: React.ReactNode;
}) {
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onToggle(columnKey)}
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {children}
        <SortIcon sort={sort} columnKey={columnKey} />
      </button>
    </TableHead>
  );
}

interface PatientSearchTableProps {
  patients: Patient[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function PatientSearchTable({
  patients,
  loading,
  error,
  currentPage,
  totalPages,
  onPageChange,
}: PatientSearchTableProps) {
  const [sort, setSort] = useState<SortState>({ key: "first_name", dir: "asc" });

  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => {
      const aVal = getSortableValue(a, sort.key);
      const bVal = getSortableValue(b, sort.key);

      return sort.dir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }, [patients, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Patient Records
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {loading ? (
          <div className="flex flex-col gap-3 px-(--card-spacing) py-4">
            {Array.from({ length: 6 }, (_, i) => `patient-skeleton-${i + 1}`).map((skeletonKey) => (
              <div key={skeletonKey} className="flex items-center gap-4">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-(--card-spacing) py-8 text-center text-sm text-destructive">
            {error}
          </div>
        ) : patients.length === 0 ? (
          <div className="px-(--card-spacing) py-12 text-center text-sm text-muted-foreground">
            No matching patient records found. Try adjusting your search or filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead sort={sort} onToggle={toggleSort} columnKey="first_name">Patient Name</SortableHead>
                <SortableHead sort={sort} onToggle={toggleSort} columnKey="hospital_number">Hospital #</SortableHead>
                <SortableHead sort={sort} onToggle={toggleSort} columnKey="date_of_birth">DOB / Age</SortableHead>
                <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Village, District
                </TableHead>
                <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPatients.map((p) => {
                const age = new Date().getFullYear() - new Date(p.date_of_birth).getFullYear();
                const status = getClinicalStatus(p);
                const action = getPrimaryAction(p);
                const ActionIcon = action.icon;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.first_name} {p.last_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.hospital_number}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(p.date_of_birth).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                      <span className="text-xs text-muted-foreground/60 ml-1">({age} yrs)</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {p.village || "N/A"}, {p.district || "N/A"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <StatusBadge label={status.label} variant={status.variant} pulse={status.pulse} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="xs"
                          variant="ghost"
                          nativeButton={false}
                          render={<Link href={action.href} />}
                        >
                          <ActionIcon className={`h-3.5 w-3.5 ${action.iconColor}`} />
                          {action.label}
                        </Button>
                        {p.registration_completed_at && (
                          <Button
                            size="xs"
                            variant="ghost"
                            nativeButton={false}
                            render={<Link href={`/patients/${p.id}`} />}
                          >
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-(--card-spacing) pt-4 mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-xs font-mono text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
