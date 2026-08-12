"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell from "../AuthShell";
import { getApiBaseUrl } from "../../../lib/config";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

const API_BASE = getApiBaseUrl();

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromQuery = searchParams.get("token") ?? "";
  const emailFromQuery = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(emailFromQuery);
  const [token, setToken] = useState(tokenFromQuery);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitLoading(true);
    setMessage(null);
    setErrors({});
    setIsSuccess(false);

    try {
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          email,
          password,
          password_confirmation: confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Unable to reset password.");
        setErrors(data.errors || {});
      } else {
        setMessage(data.message || "Password reset successfully.");
        setErrors({});
        setIsSuccess(true);
      }
    } catch {
      setMessage("Unable to reach authentication service.");
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {message ? (
        <div role="alert" className={`rounded-md border px-4 py-3 text-sm ${isSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {message}
        </div>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-clinical-primary focus:ring-clinical-primary sm:text-sm"
          placeholder="Enter your email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        {errors.email ? <p className="text-sm text-red-600">{errors.email.join(" ")}</p> : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="token" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
          Reset token
        </label>
        <input
          id="token"
          name="token"
          type="text"
          className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-clinical-primary focus:ring-clinical-primary sm:text-sm"
          placeholder="Enter reset token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          required
        />
        {errors.token ? <p className="text-sm text-red-600">{errors.token.join(" ")}</p> : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-clinical-primary focus:ring-clinical-primary sm:text-sm"
          placeholder="Enter new password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
        {errors.password ? <p className="text-sm text-red-600">{errors.password.join(" ")}</p> : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-clinical-primary focus:ring-clinical-primary sm:text-sm"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={8}
        />
        {errors.password_confirmation ? <p className="text-sm text-red-600">{errors.password_confirmation.join(" ")}</p> : null}
      </div>

      <button
        type="submit"
        disabled={submitLoading}
        className="w-full rounded-md bg-clinical-primary px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-clinical-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-clinical-primary disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitLoading ? "Resetting password..." : "Reset password"}
      </button>

      <div className="text-center text-sm text-gray-500">
        Back to{' '}
        <Link href="/" className="font-medium text-clinical-primary hover:text-clinical-primary-hover">
          Sign in
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  usePageTitle("Reset password");
  return (
    <AuthShell title="Reset Password" subtitle="Enter your new password to restore access." >
      <Suspense fallback={<div className="text-center text-sm text-gray-500">Loading form parameters...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
