"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import { ArrowLeft, Check, Loader2, TriangleAlert } from "lucide-react";

interface ReviewDetail {
  verification_request: {
    id: number;
    status: string;
    submitted_at: string;
    comments: string | null;
    submitted_by: { id: number; name: string };
    reviewed_by: { id: number; name: string } | null;
  };
  consultation: {
    encounter: { id: number; status: string; chief_complaint: string | null };
    clinical_note: { content?: string; history_of_present_illness?: string | null; physical_examination?: string | null; plan?: string | null; assessment?: string | null } | null;
    diagnoses: { id: number; code: string; description: string; diagnosis_type: string; certainty: string | null }[];
    orders: { id: number; order_type: string; test_name: string | null; clinical_indication: string | null; priority: string; status: string }[];
    prescriptions: { id: number; drug_name: string; dosage: string; route: string; frequency: string; duration: string | null; status: string }[];
  };
}

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const id = params.id as string;

  const [data, setData] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  async function fetchDetail() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/verification-requests/${id}`, token);
      setData(res?.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load review.");
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (token && id) void fetchDetail();
  }, [token, id]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  async function runAction(action: "approve" | "reject") {
    setActionLoading(true);
    setError(null);
    try {
      await api.post(
        `/verification-requests/${id}/${action}`,
        action === "reject" ? { comments: comment } : { comments: comment || undefined },
        token,
      );
      setModalOpen(false);
      setComment("");
      void fetchDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 p-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-destructive">
          <TriangleAlert className="h-5 w-5" />
          <span className="font-semibold">{error ?? "Review not found."}</span>
        </div>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/supervision")}>
          <ArrowLeft className="h-4 w-4" /> Back to queue
        </Button>
      </div>
    );
  }

  const req = data.verification_request;
  const note = data.consultation.clinical_note;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Review Consultation"
        description={`Submitted by ${req.submitted_by.name} · ${new Date(req.submitted_at).toLocaleString()} · #${data.consultation.encounter.id}`}
        action={
          <Button variant="ghost" onClick={() => router.push("/supervision")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <StatusBadge
            label={req.status}
            variant={req.status === "pending" ? "warning" : req.status === "approved" ? "success" : "error"}
          />
          {req.status === "pending" ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setModalOpen(true)}
                disabled={actionLoading}
              >
                Send Back
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => runAction("approve")}
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                <Check className="h-4 w-4 mr-1" /> Approve
              </Button>
            </div>
          ) : (
            req.comments && (
              <span className="text-sm text-muted-foreground italic">{req.comments}</span>
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
            Subjective / Objective
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-semibold">Chief complaint</p>
            <p className="text-muted-foreground">{data.consultation.encounter.chief_complaint ?? "—"}</p>
          </div>
          {note?.history_of_present_illness && (
            <div>
              <p className="font-semibold">History of present illness</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{note.history_of_present_illness}</p>
            </div>
          )}
          {note?.physical_examination && (
            <div>
              <p className="font-semibold">Physical examination</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{note.physical_examination}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          {data.consultation.diagnoses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No diagnoses recorded.</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border">
              {data.consultation.diagnoses.map((d) => (
                <div key={d.id} className="px-4 py-2.5 flex items-center gap-2.5">
                  <StatusBadge label={d.code} variant="neutral" />
                  <span className="text-sm">{d.description}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{d.diagnosis_type}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note?.plan ?? "—"}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {data.consultation.orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders.</p>
            ) : (
              <div className="divide-y divide-border rounded-lg border">
                {data.consultation.orders.map((o) => (
                  <div key={o.id} className="px-4 py-2.5">
                    <p className="text-sm font-medium">{o.test_name ?? o.order_type}</p>
                    <p className="text-xs text-muted-foreground">{o.priority} · {o.status}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            {data.consultation.prescriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No prescriptions.</p>
            ) : (
              <div className="divide-y divide-border rounded-lg border">
                {data.consultation.prescriptions.map((p) => (
                  <div key={p.id} className="px-4 py-2.5">
                    <p className="text-sm font-medium">{p.drug_name}</p>
                    <p className="text-xs text-muted-foreground">{p.dosage} {p.route} ({p.frequency}){p.duration ? ` · ${p.duration}` : ""} · {p.status}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalOpen(false)}>
          <div
            className="w-full max-w-md rounded-lg border bg-white p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">Send back for revision</h3>
            <textarea
              rows={4}
              required
              className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="What needs to be corrected?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={actionLoading || comment.trim() === ""}
                onClick={() => runAction("reject")}
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Send Back
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
