"use client";

import AuthShell from "./AuthShell";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../store/RoleContext";
import { getApiBaseUrl } from "../../lib/config";
import { adminApi } from "@/lib/services/admin";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

const API_BASE = getApiBaseUrl();

export default function LoginPage() {
  usePageTitle("Sign in");
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [signupEnabled, setSignupEnabled] = useState(false);

  useEffect(() => {
    void adminApi
      .getPublicConfig()
      .then((cfg) => setSignupEnabled(cfg.signup_enabled))
      .catch(() => setSignupEnabled(false));
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitLoading(true);
    setMessage(null);
    setErrors({});

    const payload = {
      email,
      password,
      remember,
    };

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.errors) {
          setErrors(data.errors);
        }
        setMessage(data.message || "Unable to sign in.");
      } else {
        setMessage("Signed in successfully. Redirecting...");
        login(data.data.token, data.data.user);
      }
    } catch {
      setMessage("Unable to reach authentication service.");
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <AuthShell title="Sign in" subtitle="Enter your staff credentials.">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide" htmlFor="email">
            Email
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:border-clinical-primary focus:ring-clinical-primary sm:text-sm text-gray-900"
              placeholder="Enter your email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide" htmlFor="password">
            Password
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:border-clinical-primary focus:ring-clinical-primary sm:text-sm text-gray-900 font-mono pr-10"
              placeholder="Enter Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800 focus:outline-none cursor-pointer"
            >
              {showPassword ? (
                // Eye Off Icon
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                // Eye Icon
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-500">
            <input
              type="checkbox"
              className="h-4 w-4 text-clinical-primary border-gray-300 rounded cursor-pointer focus:ring-clinical-primary"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Remember this device
          </label>
          <Link href="/auth/forgot-password" className="text-sm font-medium text-clinical-primary hover:text-clinical-primary-hover">
            Forgot password?
          </Link>
        </div>

        {message ? (
          <div
            role="alert"
            className={`rounded-md border px-4 py-3 text-sm ${
              message.startsWith("Signed in successfully")
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message}
            {Object.keys(errors).length > 0 ? (
              <ul className={`mt-2 list-disc space-y-1 pl-5 ${message.startsWith("Signed in successfully") ? "text-emerald-700" : "text-red-700"}`}>
                {Object.entries(errors).map(([field, messages]) => (
                  <li key={field}>
                    <span className="font-semibold">{field}:</span> {messages.join(" ")}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitLoading}
          className="w-full flex justify-center rounded-md bg-clinical-primary px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-clinical-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-clinical-primary disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {signupEnabled ? (
        <div className="text-center text-sm text-gray-500">
          <Link href="/auth/signup" className="font-medium text-clinical-primary hover:text-clinical-primary-hover">
            Create account
          </Link>
        </div>
      ) : null}
    </AuthShell>
  );
}
