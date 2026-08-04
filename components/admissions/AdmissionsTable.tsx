"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  BedDouble,
  ArrowUpRight,
  User,
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
import type { Admission } from "@/types/admission";

type SortKey = "admission_date" | "status" | "acuity_level" | "admission_type";
type SortDir = "asc" | "desc";

interface SortState {
  key: SortKey;
  dir: SortDir;
}

function getSortableValue(admission: Admission, key: SortKey): string {
  if (key === "admission_date") return admission.admission_date;
  return admission[key] ?? "";
}

function getAcuityVariant(level: string | null): "success" | "warning" | "error" | "info" | "neutral" | "purple" {
  switch (level) {
    case "Critical": return "error";
    case "High": return "warning";
    case "Medium": return "info";
    case "Low": return "success";
    default: return "neutral";
  }
}

function getStatusVariant(status: string): "success" | "warning" | "error" | "info" | "neutral" | "purple" {
  switch (status) {
    case "Admitted": return "success";
    case "Transferred": return "info";
    case "Discharged": return "neutral";
    default: return "neutral";
  }
}

function formatDuration(start: string, end: string | null): string {
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const days = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "<1d";
  return `${days}d`;
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

interface AdmissionsTableProps {
  admissions: Admission[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onView: (admission: Admission) => void;
  onTransfer: (admission: Admission) => void;
  onDischarge: (admission: Admission) => void;
}

export default function AdmissionsTable({
  admissions,
  loading,
  error,
  currentPage,
  totalPages,
  onPageChange,
  onView,
  onTransfer,
  onDischarge,
}: AdmissionsTableProps) {
  const [sort, setSort] = useState<SortState>({ key: "admission_date", dir: "desc" });

  const sortedAdmissions = useMemo(() => {
    return [...admissions].sort((a, b) => {
      const aVal = getSortableValue(a, sort.key);
      const bVal = getSortableValue(b, sort.key);
      return sort.dir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }, [admissions, sort]);

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
          Admission Records
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {loading ? (
          <div className="flex flex-col gap-3 px-(--card-spacing) py-4">
            {Array.from({ length: 6 }, (_, i) => `admission-skeleton-${i + 1}`).map((k) => (
              <div key={k} className="flex items-center gap-4">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-(--card-spacing) py-8 text-center text-sm text-destructive">
            {error}
          </div>
        ) : admissions.length === 0 ? (
          <div className="px-(--card-spacing) py-12 text-center text-sm text-muted-foreground">
            No admissions found. Admit a patient to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead sort={sort} onToggle={toggleSort} columnKey="admission_date">Admitted</SortableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ward / Bed</TableHead>
                <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diagnosis</TableHead>
                <SortableHead sort={sort} onToggle={toggleSort} columnKey="acuity_level">Acuity</SortableHead>
                <SortableHead sort={sort} onToggle={toggleSort} columnKey="status">Status</SortableHead>
                <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground">LOS</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAdmissions.map((adm) => (
                <TableRow key={adm.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(adm.admission_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {adm.patient ? `${adm.patient.first_name} ${adm.patient.last_name}` : `#${adm.patient_id}`}
                      </span>
                      {adm.patient?.hospital_number && (
                        <span className="font-mono text-xs text-muted-foreground">{adm.patient.hospital_number}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <BedDouble className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span className="text-sm">{adm.ward?.name || "-"}</span>
                      {adm.bed?.bed_number && (
                        <span className="text-xs font-mono text-muted-foreground/60">
                          / {adm.bed.bed_number}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                    {adm.admission_diagnosis || "-"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={adm.acuity_level || "N/A"}
                      variant={getAcuityVariant(adm.acuity_level)}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={adm.status}
                      variant={getStatusVariant(adm.status)}
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                    {adm.length_of_stay_days !== null
                      ? `${adm.length_of_stay_days}d`
                      : formatDuration(adm.admission_date, adm.discharge_date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => onView(adm)}
                      >
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                        View
                      </Button>
                      {adm.status !== "Discharged" && (
                        <>
                          <Link href={`/admissions/${adm.id}/ward-rounds`}>
                            <Button
                              size="xs"
                              variant="ghost"
                              className="text-primary hover:text-primary/80"
                            >
                              <User className="h-3 w-3" />
                              Ward Rounds
                            </Button>
                          </Link>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => onTransfer(adm)}
                            className="text-amber-600 hover:text-amber-800"
                          >
                            Transfer
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => onDischarge(adm)}
                            className="text-clinical-primary hover:text-clinical-primary-hover"
                          >
                            Discharge
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
