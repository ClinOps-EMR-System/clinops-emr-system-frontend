"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/store/RoleContext";
import { adminApi } from "@/lib/services/admin";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function SecurityPage() {
  const { token, logout } = useAuth();
  const [signupEnabled, setSignupEnabled] = useState<boolean | null>(null);
  const [hospitalName, setHospitalName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await adminApi.getSettings(token);
      setSignupEnabled(settings.signup_enabled);
      setHospitalName(settings.hospital_name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load security info");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const revokeSession = async () => {
    try {
      await adminApi.logout(token);
      setMessage("Current session revoked. You will be signed out.");
      logout();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Logout failed");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Security</h1>
        <p className="mt-1 text-sm text-[var(--clinical-muted)]">
          Access controls for {hospitalName || "this hospital"}.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-clinical-error)]">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-4">
          <section className="rounded-lg border border-[var(--outline)] bg-white p-4">
            <h2 className="text-sm font-semibold">Public signup</h2>
            <p className="mt-1 text-sm text-[var(--clinical-muted)]">
              Controlled by{" "}
              <code className="rounded bg-[var(--clinical-bg)] px-1 font-mono text-xs">
                SIGNUP_ENABLED
              </code>{" "}
              on the server. Staff should be created in System Admin, not via
              public signup.
            </p>
            <p className="mt-3 text-sm font-medium">
              Status:{" "}
              <span
                className={
                  signupEnabled
                    ? "text-amber-700"
                    : "text-[var(--clinical-primary)]"
                }
              >
                {signupEnabled ? "Enabled" : "Disabled"}
              </span>
            </p>
          </section>

          <section className="rounded-lg border border-[var(--outline)] bg-white p-4">
            <h2 className="text-sm font-semibold">Admin accounts</h2>
            <p className="mt-1 text-sm text-[var(--clinical-muted)]">
              Create or promote Admin users only via Artisan:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md bg-[var(--clinical-bg)] p-3 font-mono text-xs">
              php artisan clinops:create-admin admin@hospital.mw --name=&quot;Hospital
              Admin&quot;
            </pre>
          </section>

          <section className="rounded-lg border border-[var(--outline)] bg-white p-4">
            <h2 className="text-sm font-semibold">This session</h2>
            <p className="mt-1 text-sm text-[var(--clinical-muted)]">
              Revoke the current API token and return to the login screen.
              Logging in again replaces any prior token for your account.
            </p>
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => void revokeSession()}
            >
              Revoke session & log out
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}
