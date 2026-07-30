"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useFetch } from "../../../../lib/useFetch";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../store/RoleContext";
import { SectionHeader } from "../../../../components/ui/PageLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatusBadge from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import SelectField from "../../../../components/ui/SelectField";
import EmptyState from "../../../../components/ui/EmptyState";
import Modal from "../../../../components/ui/Modal";
import { Search, X, Pill, Clock, CheckCircle, AlertTriangle, User } from "lucide-react";

interface Prescription {
  id: number;
  patient_id: number;
  encounter_id: number;
  drug_id: number;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity_dispensed: number | null;
  status: string;
  notes: string | null;
  dispensed_at: string | null;
  dispensed_by: number | null;
  created_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  drug?: {
    name: string;
    is_controlled: boolean;
    formulation: string;
    strength: string;
  };
  prescribedBy?: {
    name: string;
  };
}

interface StockBatch {
  id: number;
  batch_number: string;
  expiry_date: string;
  quantity_remaining: number;
}

type StatusFilter = "all" | "prescribed" | "verified" | "dispensed" | "cancelled";

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "prescribed", label: "Prescribed" },
  { value: "verified", label: "Verified" },
  { value: "dispensed", label: "Dispensed" },
  { value: "cancelled", label: "Cancelled" },
];

function getStatusVariant(status: string): "success" | "warning" | "error" | "info" | "neutral" | "purple" {
  switch (status?.toLowerCase()) {
    case "dispensed": return "success";
    case "verified": return "info";
    case "prescribed": return "warning";
    case "cancelled": return "error";
    default: return "neutral";
  }
}

export default function DispensingPage() {
  const { token } = useAuth();
  const { data: prescriptionsRaw, loading, refetch } = useFetch<Prescription[]>("/prescriptions", { interval: 30000 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [dispensing, setDispensing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stockBatches, setStockBatches] = useState<StockBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [dispenseQuantity, setDispenseQuantity] = useState(1);
  const [batchesLoading, setBatchesLoading] = useState(false);

  const prescriptions = useMemo(
    () => (Array.isArray(prescriptionsRaw) ? prescriptionsRaw : []),
    [prescriptionsRaw]
  );

  const hasFilters = search !== "" || statusFilter !== "all";

  const filteredPrescriptions = useMemo(() => {
    let result = [...prescriptions];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (rx) =>
          rx.drug?.name?.toLowerCase().includes(q) ||
          rx.patient?.hospital_number?.toLowerCase().includes(q) ||
          rx.patient?.first_name?.toLowerCase().includes(q) ||
          rx.patient?.last_name?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((rx) => rx.status?.toLowerCase() === statusFilter);
    }

    return result;
  }, [prescriptions, search, statusFilter]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const openDispenseModal = async (rx: Prescription) => {
    setSelectedPrescription(rx);
    setSelectedBatchId(null);
    setDispenseQuantity(1);
    setDispenseModalOpen(true);

    if (rx.drug_id) {
      setBatchesLoading(true);
      try {
        const res = await api.get(`/stock/${rx.drug_id}/batches`, token);
        const batches = res?.data?.data ?? res?.data ?? [];
        setStockBatches(Array.isArray(batches) ? batches : []);
        if (batches.length > 0) {
          setSelectedBatchId(batches[0].id);
        }
      } catch {
        setStockBatches([]);
      } finally {
        setBatchesLoading(false);
      }
    }
  };

  const handleDispense = async () => {
    if (!selectedPrescription || !selectedBatchId) return;
    setDispensing(true);
    setError(null);
    try {
      if (selectedPrescription.status?.toLowerCase() === "prescribed") {
        await api.post(`/prescriptions/${selectedPrescription.id}/verify`, {}, token);
      }
      await api.post(`/prescriptions/${selectedPrescription.id}/dispense`, {
        items: [{ stock_batch_id: selectedBatchId, quantity: dispenseQuantity }],
      }, token);
      setDispenseModalOpen(false);
      setSelectedPrescription(null);
      refetch();
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      setError(apiError.message || "Failed to dispense");
    } finally {
      setDispensing(false);
    }
  };

  const handleVerify = async (rx: Prescription) => {
    try {
      setError(null);
      await api.post(`/prescriptions/${rx.id}/verify`, {}, token);
      refetch();
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      setError(apiError.message || "Failed to verify");
    }
  };

  const pendingCount = prescriptions.filter((rx) => rx.status?.toLowerCase() === "prescribed").length;
  const verifiedCount = prescriptions.filter((rx) => rx.status?.toLowerCase() === "verified").length;
  const dispensedCount = prescriptions.filter((rx) => rx.status?.toLowerCase() === "dispensed").length;
  const controlledCount = prescriptions.filter((rx) => rx.drug?.is_controlled && rx.status?.toLowerCase() !== "dispensed").length;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Prescription Dispensing"
        description="View, verify, and dispense patient prescriptions"
      />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all hover:shadow-sm">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className={cn("size-4", pendingCount > 0 ? "text-amber-500" : "text-muted-foreground/60")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-semibold tabular-nums tracking-tight", pendingCount > 0 ? "text-amber-600" : "text-foreground")}>
              {loading ? <Skeleton className="h-8 w-16" /> : pendingCount}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-sm">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Verified
            </CardTitle>
            <CheckCircle className="size-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {loading ? <Skeleton className="h-8 w-16" /> : verifiedCount}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-sm">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dispensed
            </CardTitle>
            <CheckCircle className="size-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {loading ? <Skeleton className="h-8 w-16" /> : dispensedCount}
            </div>
          </CardContent>
        </Card>

        <Card className={cn("transition-all hover:shadow-sm", controlledCount > 0 && "ring-1 ring-red-500/20")}>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Controlled
            </CardTitle>
            <AlertTriangle className={cn("size-4", controlledCount > 0 ? "text-red-500" : "text-muted-foreground/60")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-semibold tabular-nums tracking-tight", controlledCount > 0 ? "text-red-600" : "text-foreground")}>
              {loading ? <Skeleton className="h-8 w-16" /> : controlledCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Toolbar */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by drug name, patient name, or hospital number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px]">
              <SelectField
                label="Status"
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              />
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-destructive hover:text-destructive/80 h-9 mt-5"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Prescriptions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="px-6 py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Drug</TableHead>
                    <TableHead className="hidden md:table-cell">Dosage</TableHead>
                    <TableHead className="hidden lg:table-cell">Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20 mt-1" />
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 rounded-md" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<Pill className="h-6 w-6 text-muted-foreground/40" />}
                title={prescriptions.length === 0 ? "No prescriptions" : "No prescriptions match your filters"}
                description={
                  prescriptions.length === 0
                    ? "No prescriptions have been created yet."
                    : "Try adjusting your search or filter criteria."
                }
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Drug</TableHead>
                    <TableHead className="hidden md:table-cell">Dosage</TableHead>
                    <TableHead className="hidden lg:table-cell">Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrescriptions.map((rx) => (
                    <TableRow key={rx.id}>
                      <TableCell>
                        <Link
                          href={`/patients/${rx.patient_id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {rx.patient ? `${rx.patient.first_name} ${rx.patient.last_name}` : `Patient #${rx.patient_id}`}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono">
                          {rx.patient?.hospital_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{rx.drug?.name || "—"}</div>
                        {rx.drug?.is_controlled && (
                          <StatusBadge label="Controlled" variant="error" />
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground font-mono text-sm">
                        {rx.dosage} {rx.route}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {rx.frequency}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={rx.status} variant={getStatusVariant(rx.status)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {rx.status?.toLowerCase() === "prescribed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleVerify(rx)}
                            >
                              Verify
                            </Button>
                          )}
                          {(rx.status?.toLowerCase() === "verified" || rx.status?.toLowerCase() === "prescribed") && (
                            <Button
                              size="sm"
                              onClick={() => openDispenseModal(rx)}
                            >
                              Dispense
                            </Button>
                          )}
                          <Link
                            href={`/patients/${rx.patient_id}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            <User className="h-4 w-4" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="px-6 py-3 border-t text-xs text-muted-foreground font-mono">
                Showing {filteredPrescriptions.length} of {prescriptions.length} prescriptions
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dispense Modal */}
      <Modal
        open={dispenseModalOpen}
        onClose={() => { setDispenseModalOpen(false); setSelectedPrescription(null); }}
        title="Confirm Dispensing"
        subtitle="Select stock batch and quantity to dispense"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => { setDispenseModalOpen(false); setSelectedPrescription(null); }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDispense}
              disabled={dispensing || !selectedBatchId || dispenseQuantity < 1}
            >
              {dispensing ? "Dispensing..." : "Confirm Dispense"}
            </Button>
          </>
        }
      >
        {selectedPrescription && (
          <div className="space-y-4">
            <div className="rounded border p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prescription Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Patient:</span>
                  <p className="font-medium">
                    {selectedPrescription.patient ? `${selectedPrescription.patient.first_name} ${selectedPrescription.patient.last_name}` : `#${selectedPrescription.patient_id}`}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Hospital #:</span>
                  <p className="font-medium font-mono">{selectedPrescription.patient?.hospital_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Drug:</span>
                  <p className="font-medium">{selectedPrescription.drug?.name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Dosage:</span>
                  <p className="font-medium font-mono">{selectedPrescription.dosage} {selectedPrescription.route}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Frequency:</span>
                  <p className="font-medium">{selectedPrescription.frequency}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Duration:</span>
                  <p className="font-medium">{selectedPrescription.duration}</p>
                </div>
              </div>
            </div>

            <div className="border rounded p-4 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dispense Details</h4>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Stock Batch</label>
                {batchesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : stockBatches.length === 0 ? (
                  <div className="text-sm text-destructive">No stock batches available for this drug.</div>
                ) : (
                  <SelectField
                    label=""
                    options={stockBatches.map((b) => ({
                      value: String(b.id),
                      label: `${b.batch_number} — ${b.quantity_remaining} units${new Date(b.expiry_date) < new Date() ? " (EXPIRED)" : ` (exp: ${new Date(b.expiry_date).toLocaleDateString()})`}`,
                    }))}
                    value={String(selectedBatchId ?? "")}
                    onChange={(e) => setSelectedBatchId(Number(e.target.value))}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Quantity to Dispense</label>
                <Input
                  type="number"
                  min={1}
                  value={dispenseQuantity}
                  onChange={(e) => setDispenseQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              {selectedPrescription.drug?.is_controlled && (
                <StatusBadge label="Controlled Substance — Audit Trail Required" variant="error" />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
