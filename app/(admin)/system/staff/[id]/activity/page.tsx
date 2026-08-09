"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/store/RoleContext";
import { adminApi } from "@/lib/services/admin";
import type { AdminUser, AuditLogEntry } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ClinicalTimeline from "@/components/audit/ClinicalTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/ui/StatusBadge";

export default function UserActivityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [events, setEvents] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, activityRes] = await Promise.all([
        adminApi.getUser(token, id),
        adminApi.userActivity(token, id, { per_page: 100 }),
      ]);
      setUser(userRes);
      setEvents(activityRes.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user activity");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    if (id) void load();
  }, [load, id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center">
        <p className="text-sm text-destructive">{error || "User not found"}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/system/staff")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Staff
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/system/staff" className="hover:text-foreground hover:underline">
              Staff
            </Link>
            <span>/</span>
            <Link href={`/system/staff/${id}`} className="hover:text-foreground hover:underline">
              {user.name}
            </Link>
            <span>/</span>
            <span className="text-foreground">Activity</span>
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">User Activity</h1>
          <p className="mt-1 text-sm text-[var(--clinical-muted)]">
            All actions performed by {user.name}.
          </p>
        </div>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/system/staff/${id}`} />}>
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Staff Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="font-medium">{user.name}</span>
              <span className="ml-2 text-muted-foreground">@{user.username}</span>
            </div>
            <StatusBadge
              label={user.is_active ? "Active" : "Inactive"}
              variant={user.is_active ? "success" : "neutral"}
              size="sm"
            />
            {user.department && (
              <span className="text-muted-foreground">{user.department.name}</span>
            )}
            {user.roles && user.roles.length > 0 && (
              <span className="text-muted-foreground">
                {user.roles.map((r) => r.name).join(", ")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <ClinicalTimeline events={events} loading={false} showPatient />
        </CardContent>
      </Card>
    </div>
  );
}
