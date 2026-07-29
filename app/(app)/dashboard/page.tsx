"use client";

import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { useFetch } from "../../../lib/useFetch";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Users,
  Clock,
  Stethoscope,
  ArrowRight,
  Plus,
  Ambulance,
  DoorOpen,
  Pill,
} from "lucide-react";

interface DashboardData {
  patients?: {
    total?: number;
    emergency?: number;
    today_registrations?: number;
    recent?: Array<{
      id: number;
      hospital_number: string;
      first_name: string;
      last_name: string;
      gender: string;
      patient_category: string;
      village: string;
      district: string;
      created_at: string;
      registration_completed_at: string | null;
    }>;
  };
  encounters?: {
    awaiting_triage?: number;
    in_consultation?: number;
    emergency?: number;
    discharged_today?: number;
  };
  queue?: {
    waiting_for_doctor?: number;
    by_priority?: Record<string, number>;
    oldest_wait_time?: number;
  };
}

interface FlowStage {
  key: string;
  label: string;
  count: number;
  href: string;
  color: string;
  icon: typeof Users;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: dashboard, loading, error } = useFetch<DashboardData>("/dashboard");

  const staffName = user?.name?.split(" ")[0] || "Staff";
  const userRoles = (user?.roles || []).map((r) => r.toLowerCase());
  const isAdmin = userRoles.includes("admin");

  const stats = {
    totalPatients: dashboard?.patients?.total ?? 0,
    awaitingTriage: dashboard?.encounters?.awaiting_triage ?? 0,
    inConsultation: dashboard?.encounters?.in_consultation ?? 0,
    emergency: dashboard?.encounters?.emergency ?? 0,
    dischargedToday: dashboard?.encounters?.discharged_today ?? 0,
    registeredToday: dashboard?.patients?.today_registrations ?? 0,
    waitingForDoctor: dashboard?.queue?.waiting_for_doctor ?? 0,
  };

  const flowStages: FlowStage[] = [
    {
      key: "waiting",
      label: "Waiting",
      count: stats.waitingForDoctor,
      href: "/queue",
      color: "text-amber-600",
      icon: Clock,
    },
    {
      key: "triage",
      label: "Awaiting Triage",
      count: stats.awaitingTriage,
      href: "/triage-queue",
      color: "text-sky-600",
      icon: Stethoscope,
    },
    {
      key: "consultation",
      label: "In Consultation",
      count: stats.inConsultation,
      href: "/consultation-queue",
      color: "text-blue-600",
      icon: Users,
    },
    {
      key: "pharmacy",
      label: "To Pharmacy",
      count: 0,
      href: "/pharmacy",
      color: "text-emerald-600",
      icon: Pill,
    },
    {
      key: "discharge",
      label: "Discharged Today",
      count: stats.dischargedToday,
      href: "/admissions",
      color: "text-teal-600",
      icon: DoorOpen,
    },
  ];

  const recentPatients = dashboard?.patients?.recent ?? [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Clinical Workspace
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {greeting}, {staffName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            render={<Link href="/patients/register" />}
          >
            <Plus data-icon="inline-start" />
            Register Patient
          </Button>
          <Button
            variant="outline"
            render={<Link href="/patients/register?emergency=true" />}
          >
            <Ambulance data-icon="inline-start" />
            Emergency
          </Button>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/patients" className="block">
          <Card className="transition-all hover:shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Patients
              </CardTitle>
              <Users className="size-4 text-muted-foreground/60" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {loading ? <Skeleton className="h-8 w-16" /> : stats.totalPatients}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/patients/register" className="block">
          <Card className="transition-all hover:shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Registered Today
              </CardTitle>
              <Plus className="size-4 text-muted-foreground/60" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {loading ? <Skeleton className="h-8 w-16" /> : stats.registeredToday}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/triage-queue" className="block">
          <Card className={cn(
            "transition-all hover:shadow-sm",
            stats.awaitingTriage > 0 && "ring-1 ring-amber-500/20"
          )}>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Awaiting Triage
              </CardTitle>
              <Clock className={cn(
                "size-4",
                stats.awaitingTriage > 0 ? "text-amber-500" : "text-muted-foreground/60"
              )} />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-3xl font-semibold tabular-nums tracking-tight",
                stats.awaitingTriage > 0 ? "text-amber-600" : "text-foreground"
              )}>
                {loading ? <Skeleton className="h-8 w-16" /> : stats.awaitingTriage}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/emergency-queue" className="block">
          <Card className={cn(
            "transition-all hover:shadow-sm",
            stats.emergency > 0 && "ring-1 ring-red-500/20"
          )}>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <span className={cn(
                  "size-1.5 rounded-full",
                  stats.emergency > 0 ? "bg-red-500 animate-pulse" : "bg-muted-foreground/60"
                )} />
                Emergency
              </CardTitle>
              <Ambulance className={cn(
                "size-4",
                stats.emergency > 0 ? "text-red-500" : "text-muted-foreground/60"
              )} />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-3xl font-semibold tabular-nums tracking-tight",
                stats.emergency > 0 ? "text-red-600" : "text-foreground"
              )}>
                {loading ? <Skeleton className="h-8 w-16" /> : stats.emergency}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Patient Flow Pipeline */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Patient Flow
          </h2>
          {loading && (
            <span className="size-1.5 rounded-full bg-muted-foreground/30 animate-pulse" />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {flowStages.map((stage, i) => (
            <div key={stage.key} className="flex items-center gap-3 sm:flex-col sm:gap-2">
              <Link
                href={stage.href}
                className={cn(
                  "flex sm:w-full items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm sm:flex-col sm:gap-2 sm:text-center",
                  stage.count > 0
                    ? "border-foreground/10 bg-background"
                    : "border-dashed border-foreground/5 bg-muted/30"
                )}
              >
                <stage.icon className={cn(
                  "size-5 shrink-0",
                  stage.count > 0 ? stage.color : "text-muted-foreground/40"
                )} />
                <div className="flex flex-col sm:items-center">
                  <span className={cn(
                    "text-xl font-semibold tabular-nums tracking-tight leading-none",
                    stage.count > 0 ? "text-foreground" : "text-muted-foreground/50"
                  )}>
                    {loading ? "..." : stage.count}
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-muted-foreground leading-tight">
                    {stage.label}
                  </span>
                </div>
              </Link>
              {i < flowStages.length - 1 && (
                <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground/30 sm:block" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Button
                variant="outline"
                className="h-auto flex-col gap-1.5 p-4"
                render={<Link href="/pharmacy" />}
              >
                <Pill className="size-5 text-amber-600" />
                <span className="text-xs font-medium">Pharmacy</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-1.5 p-4"
                render={<Link href="/lab" />}
              >
                <svg className="size-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <span className="text-xs font-medium">Lab Orders</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-1.5 p-4"
                render={<Link href="/billing" />}
              >
                <span className="flex size-5 items-center justify-center text-sm font-bold text-emerald-600">
                  $
                </span>
                <span className="text-xs font-medium">Billing</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-1.5 p-4"
                render={<Link href="/admin" />}
              >
                <span className="flex size-5 items-center justify-center text-sm font-bold text-purple-600">
                  Ad
                </span>
                <span className="text-xs font-medium">Administration</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Patients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Patient Registrations
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="flex flex-col gap-3 px-(--card-spacing) py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-28" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="px-(--card-spacing) py-8 text-center text-sm text-destructive">
              {error}
            </div>
          ) : recentPatients.length === 0 ? (
            <div className="px-(--card-spacing) py-12 text-center text-sm text-muted-foreground">
              No patient registrations recorded today.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Hospital #</TableHead>
                  <TableHead>Gender / Category</TableHead>
                  <TableHead className="hidden md:table-cell">Village / District</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPatients.map((patient) => {
                  const hasIncompleteReg = !patient.registration_completed_at;
                  return (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        {patient.first_name} {patient.last_name}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {patient.hospital_number}
                      </TableCell>
                      <TableCell>
                        {patient.gender} &middot; {patient.patient_category}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {patient.village || "N/A"}, {patient.district || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {hasIncompleteReg ? (
                            <Badge variant="destructive">Draft</Badge>
                          ) : (
                            <Badge variant="secondary">Registered</Badge>
                          )}
                          <div className="flex gap-2">
                            {hasIncompleteReg ? (
                              <Button
                                size="xs"
                                variant="link"
                                render={<Link href={`/patients/register?complete=${patient.id}`} />}
                              >
                                Complete
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="xs"
                                  variant="link"
                                  render={<Link href={`/patients/${patient.id}/triage`} />}
                                >
                                  Triage
                                </Button>
                                <Button
                                  size="xs"
                                  variant="link"
                                  render={<Link href={`/patients/${patient.id}/consultation`} />}
                                >
                                  Consult
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
