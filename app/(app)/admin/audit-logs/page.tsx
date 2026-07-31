"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import { SectionHeader } from "@/components/ui/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import {
  Shield,
  Search,
  Calendar,
  User as UserIcon,
  Filter,
  RotateCcw,
  Eye,
  Clock,
  Globe,
  Monitor,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Code,
  Check,
  FileJson,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export interface AuditUser {
  id: number;
  name: string;
  email: string;
  role?: string | null;
}

export interface AuditLogItem {
  id: number;
  user_id: number | null;
  user?: AuditUser | null;
  action: string;
  auditable_type: string;
  auditable_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface MetaPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const ACTION_COLOR_MAP: Record<string, { bg: string; border: string }> = {
  CREATE: { bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
  UPDATE: { bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
  DELETE: { bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400", border: "border-rose-200 dark:border-rose-800" },
  TRANSFER: { bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
  DISCHARGE: { bg: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
  VIEW_PHI: { bg: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800" },
};


function getShortEntityName(type: string): string {
  if (!type) return "Entity";
  const parts = type.split("\\");
  return parts[parts.length - 1];
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return "Unknown Client";
  if (ua.includes("Chrome")) return "Chrome Browser";
  if (ua.includes("Firefox")) return "Firefox Browser";
  if (ua.includes("Safari")) return "Safari Browser";
  if (ua.includes("Edge")) return "Edge Browser";
  if (ua.includes("Postman")) return "Postman API Client";
  return "HTTP Client";
}

export default function AuditLogsPage() {
  const { token } = useAuth();

  // State & Filters
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityFilter, setEntityFilter] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(15);
  const [meta, setMeta] = useState<MetaPagination>({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  // Diff Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<"visual" | "json">("visual");

  const fetchAuditLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("per_page", perPage.toString());

      if (search.trim()) params.set("search", search.trim());
      if (actionFilter) params.set("action", actionFilter);
      if (entityFilter) params.set("auditable_type", entityFilter);
      if (userFilter.trim()) params.set("user_id", userFilter.trim());
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const response = await api.get(`/v1/audit-logs?${params.toString()}`, token);
      if (response) {
        setLogs(response.data || []);
        if (response.meta) {
          setMeta(response.meta);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, perPage, search, actionFilter, entityFilter, userFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleResetFilters = () => {
    setSearch("");
    setActionFilter("");
    setEntityFilter("");
    setUserFilter("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  // Diff computation helper
  const diffs = useMemo(() => {
    if (!selectedLog) return [];
    const oldVals = selectedLog.old_values || {};
    const newVals = selectedLog.new_values || {};

    const allKeys = Array.from(new Set([...Object.keys(oldVals), ...Object.keys(newVals)]));

    return allKeys.map((key) => {
      const oldVal = oldVals[key];
      const newVal = newVals[key];

      let type: "ADDED" | "REMOVED" | "MODIFIED" | "UNCHANGED" = "UNCHANGED";
      if (!(key in oldVals) && key in newVals) {
        type = "ADDED";
      } else if (key in oldVals && !(key in newVals)) {
        type = "REMOVED";
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        type = "MODIFIED";
      }

      return { key, oldVal, newVal, type };
    });
  }, [selectedLog]);

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeader
          title="System Audit Logs"
          description="Immutable, real-time audit trial tracking all clinical actions and data modifications"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuditLogs}
            disabled={loading}
            className="h-9 gap-2"
          >
            <RotateCcw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter & Search Header */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Free Search */}
            <div className="relative col-span-1 sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search IP, Record ID, content..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Action Filter */}
            <div>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="DISCHARGE">DISCHARGE</option>
                <option value="VIEW_PHI">VIEW PHI</option>
              </select>
            </div>

            {/* Entity Filter */}
            <div>
              <select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Entities</option>
                <option value="Admission">Admission</option>
                <option value="Bed">Bed</option>
                <option value="Ward">Ward</option>
                <option value="Encounter">Encounter</option>
                <option value="Patient">Patient</option>
                <option value="Diagnosis">Diagnosis</option>
                <option value="Bill">Bill</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Active Filters / Reset */}
          {(search || actionFilter || entityFilter || userFilter || dateFrom || dateTo) && (
            <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">Active filters:</span>
                {actionFilter && (
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                    Action: {actionFilter}
                  </span>
                )}
                {entityFilter && (
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                    Entity: {entityFilter}
                  </span>
                )}
                {search && (
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                    Search: &quot;{search}&quot;
                  </span>
                )}
                {dateFrom && (
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                    From: {dateFrom}
                  </span>
                )}
                {dateTo && (
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                    To: {dateTo}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <RotateCcw className="size-3" />
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded text-sm flex items-center gap-2">
          <Info className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Layers className="size-3.5" />
              Audit Stream ({meta.total} records)
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Per page:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-7 text-xs rounded border border-input bg-background px-2"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-2 border-b">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={<Shield className="size-8 text-muted-foreground/40" />}
                title="No Audit Logs Found"
                description="No log entries match your current search filters or date range."
              />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[200px]">User</TableHead>
                  <TableHead className="w-[120px]">Action</TableHead>
                  <TableHead className="w-[180px]">Target Resource</TableHead>
                  <TableHead className="w-[160px]">Client / IP</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const style = ACTION_COLOR_MAP[log.action] || {
                    bg: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                    border: "border-gray-200",
                  };
                  const isoDate = log.created_at ? parseISO(log.created_at) : new Date();
                  const relativeTime = log.created_at
                    ? formatDistanceToNow(isoDate, { addSuffix: true })
                    : "—";
                  const fullUtcTime = log.created_at
                    ? format(isoDate, "yyyy-MM-dd HH:mm:ss 'UTC'")
                    : "—";

                  return (
                    <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                      {/* Timestamp */}
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5" title={fullUtcTime}>
                          <Clock className="size-3 text-muted-foreground/60 shrink-0" />
                          <span>{relativeTime}</span>
                        </div>
                      </TableCell>

                      {/* User */}
                      <TableCell>
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {log.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold truncate text-foreground">
                                {log.user.name}
                              </span>
                              {log.user.role && (
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                                  {log.user.role}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                            <Sparkles className="size-3 text-amber-500" />
                            <span>System</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Action Badge */}
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${style.bg} ${style.border}`}
                        >
                          {log.action}
                        </span>
                      </TableCell>

                      {/* Target Resource */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-muted text-[11px] font-mono font-medium text-foreground border">
                            {getShortEntityName(log.auditable_type)}
                          </span>
                          {log.auditable_id && (
                            <span className="text-xs font-mono text-muted-foreground">
                              #{log.auditable_id}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* IP / Client */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-xs font-mono">
                          <div className="flex items-center gap-1 text-foreground/80">
                            <Globe className="size-3 text-muted-foreground/60" />
                            <span>{log.ip_address || "127.0.0.1"}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-sans truncate max-w-[140px]">
                            {parseUserAgent(log.user_agent)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Details / Diff Button */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setDiffViewMode("visual");
                          }}
                          className="h-8 gap-1 text-xs hover:bg-primary/10 hover:text-primary"
                        >
                          <Eye className="size-3.5" />
                          View Changes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination Bar */}
        {meta.total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing <span className="font-semibold text-foreground">{(meta.current_page - 1) * meta.per_page + 1}</span> to{" "}
              <span className="font-semibold text-foreground">
                {Math.min(meta.current_page * meta.per_page, meta.total)}
              </span>{" "}
              of <span className="font-semibold text-foreground">{meta.total}</span> entries
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="size-4" />
                <span className="sr-only">Previous Page</span>
              </Button>
              <span className="px-3 py-1 font-mono text-xs">
                Page {meta.current_page} of {meta.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= meta.last_page}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="size-4" />
                <span className="sr-only">Next Page</span>
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Change Diff Viewer Modal */}
      {selectedLog && (
        <Modal
          open={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title={`Audit Record #${selectedLog.id} — ${selectedLog.action} ${getShortEntityName(
            selectedLog.auditable_type
          )}`}
          subtitle={`Recorded ${
            selectedLog.created_at
              ? format(parseISO(selectedLog.created_at), "PPP 'at' pp 'UTC'")
              : ""
          }`}
          footer={
            <Button variant="outline" onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Log Metadata Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-lg border text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">
                  Performed By
                </span>
                <span className="font-medium">
                  {selectedLog.user ? selectedLog.user.name : "System"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">
                  Target Entity
                </span>
                <span className="font-mono">
                  {getShortEntityName(selectedLog.auditable_type)} #{selectedLog.auditable_id}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">
                  IP Address
                </span>
                <span className="font-mono">{selectedLog.ip_address || "127.0.0.1"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">
                  Client Agent
                </span>
                <span className="truncate block" title={selectedLog.user_agent || ""}>
                  {parseUserAgent(selectedLog.user_agent)}
                </span>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Code className="size-3.5" />
                State Diff Comparison
              </span>
              <div className="flex gap-1 bg-muted p-0.5 rounded text-xs">
                <button
                  type="button"
                  onClick={() => setDiffViewMode("visual")}
                  className={`px-2.5 py-1 rounded transition-colors font-medium ${
                    diffViewMode === "visual"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Visual Diff
                </button>
                <button
                  type="button"
                  onClick={() => setDiffViewMode("json")}
                  className={`px-2.5 py-1 rounded transition-colors font-medium ${
                    diffViewMode === "json"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Raw JSON
                </button>
              </div>
            </div>

            {/* Visual Diff Table */}
            {diffViewMode === "visual" && (
              <div className="space-y-2">
                {diffs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No state changes recorded for this action.
                  </p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-xs">Field</TableHead>
                          <TableHead className="text-xs">Old Value</TableHead>
                          <TableHead className="text-xs">New Value</TableHead>
                          <TableHead className="text-xs text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {diffs.map((d) => {
                          let rowBg = "";
                          let badgeStyle = "bg-gray-100 text-gray-700";

                          if (d.type === "ADDED") {
                            rowBg = "bg-emerald-500/10";
                            badgeStyle = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
                          } else if (d.type === "REMOVED") {
                            rowBg = "bg-rose-500/10";
                            badgeStyle = "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300";
                          } else if (d.type === "MODIFIED") {
                            rowBg = "bg-amber-500/10";
                            badgeStyle = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
                          }

                          return (
                            <TableRow key={d.key} className={rowBg}>
                              <TableCell className="font-mono text-xs font-semibold text-foreground">
                                {d.key}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-rose-700 dark:text-rose-400 break-all">
                                {d.oldVal !== undefined
                                  ? typeof d.oldVal === "object"
                                    ? JSON.stringify(d.oldVal)
                                    : String(d.oldVal)
                                  : "—"}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-emerald-700 dark:text-emerald-400 break-all">
                                {d.newVal !== undefined
                                  ? typeof d.newVal === "object"
                                    ? JSON.stringify(d.newVal)
                                    : String(d.newVal)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${badgeStyle}`}>
                                  {d.type}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* Raw JSON View */}
            {diffViewMode === "json" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-rose-600 block">
                    old_values
                  </span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-md overflow-x-auto max-h-[300px]">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                    new_values
                  </span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-md overflow-x-auto max-h-[300px]">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
