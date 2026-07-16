"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell from "../AuthShell";
import { useAuth } from "@/hooks/useAuth";

function ResetPasswordForm() {
  const { resetPassword } = useAuth();
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
      const data = await resetPassword({
        token,
        email,
        password,
        password_confirmation: confirmPassword,
      }) as { message?: string };
      setMessage(data.message || "Password reset successfully.");
      setErrors({});
      setIsSuccess(true);
    } catch (error: unknown) {
      const err = error as { message?: string; errors?: Record<string, string[]> };
      setMessage(err.message || "Unable to reset password.");
      setErrors(err.errors || {});
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {message ? (
        <div className={`rounded-md px-4 py-3 text-sm ${isSuccess ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
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
          className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-[#00a651] focus:ring-[#00a651] sm:text-sm"
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
          className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-[#00a651] focus:ring-[#00a651] sm:text-sm"
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
          className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-[#00a651] focus:ring-[#00a651] sm:text-sm"
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
          className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-[#00a651] focus:ring-[#00a651] sm:text-sm"
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
        className="w-full rounded-md bg-[#00a651] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#048f47] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00a651] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitLoading ? "Resetting password..." : "Reset password"}
      </button>

      <div className="text-center text-sm text-gray-500">
        Back to{' '}
        <Link href="/" className="font-medium text-[#0ea5e9] hover:text-[#0288c4]">
          Sign in
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Reset Password" subtitle="Enter your new password to restore access." >
      <Suspense fallback={<div className="text-center text-sm text-gray-500">Loading form parameters...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
