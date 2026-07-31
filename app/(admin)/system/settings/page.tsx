"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/store/RoleContext";
import { adminApi } from "@/lib/services/admin";
import type { HospitalSettings } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const { token } = useAuth();
  const [form, setForm] = useState<HospitalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setForm(await adminApi.getSettings(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const next = await adminApi.updateSettings(token, {
        hospital_name: form.hospital_name,
        address: form.address,
        phone: form.phone,
        timezone: form.timezone,
        logo_url: form.logo_url,
      });
      setForm(next);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Hospital settings
        </h1>
        <p className="mt-1 text-sm text-[var(--clinical-muted)]">
          Profile details shown across the admin console.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-clinical-error)]">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-[var(--clinical-primary)]">
          Settings saved.
        </div>
      )}

      {loading || !form ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-[var(--outline)] bg-white p-4">
          {(
            [
              ["hospital_name", "Hospital name"],
              ["address", "Address"],
              ["phone", "Phone"],
              ["timezone", "Timezone"],
              ["logo_url", "Logo URL"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block space-y-1 text-sm">
              <span className="font-medium">{label}</span>
              <Input
                value={form[key] || ""}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, [key]: e.target.value } : f))
                }
              />
            </label>
          ))}
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      )}
    </div>
  );
}
