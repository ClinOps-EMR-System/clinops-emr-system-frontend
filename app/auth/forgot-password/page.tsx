"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "../AuthShell";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
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
      const data = await forgotPassword(email) as { message?: string };
      setMessage(data.message || "Password reset link sent to your email.");
      setErrors({});
      setIsSuccess(true);
    } catch (error: unknown) {
      const err = error as { message?: string; errors?: Record<string, string[]> };
      setMessage(err.message || "Unable to send reset email.");
      setErrors(err.errors || {});
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <AuthShell title="Forgot Password" subtitle="Enter the email used for your staff account to receive a reset link." >
      <form className="space-y-6" onSubmit={handleSubmit}>
        {message ? (
          <div className={`rounded-md px-4 py-3 text-sm ${isSuccess ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
            {message}
          </div>
        ) : null}

        <div className="space-y-1">
          <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
            Email (for password reset)
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

        <button
          type="submit"
          disabled={submitLoading}
          className="w-full rounded-md bg-[#00a651] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#048f47] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00a651] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitLoading ? "Sending reset link..." : "Reset password"}
        </button>

        <div className="text-center text-sm text-gray-500">
          Remembered your credentials?{' '}
          <Link href="/" className="font-medium text-[#0ea5e9] hover:text-[#0288c4]">
            Sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
