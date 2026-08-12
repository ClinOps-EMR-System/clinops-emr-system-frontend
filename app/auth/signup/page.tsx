"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthShell from "../AuthShell";
import { getApiBaseUrl } from "../../../lib/config";
import { adminApi } from "@/lib/services/admin";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

const API_BASE = getApiBaseUrl();

export default function SignupPage() {
  usePageTitle("Create account");
  const [signupEnabled, setSignupEnabled] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    void adminApi
      .getPublicConfig()
      .then((cfg) => setSignupEnabled(cfg.signup_enabled))
      .catch(() => setSignupEnabled(false));
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signupEnabled) return;
    setSubmitLoading(true);
    setMessage(null);
    setErrors({});
    setIsSuccess(false);

    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Unable to create account.");
        setErrors(data.errors || {});
      } else {
        setMessage(data.message || "Account created successfully.");
        setErrors({});
        setIsSuccess(true);
      }
    } catch {
      setMessage("Unable to reach authentication service.");
    } finally {
      setSubmitLoading(false);
    }
  }

  if (signupEnabled === null) {
    return (
      <AuthShell title="Create account" subtitle="Checking availability…">
        <p className="text-sm text-gray-500">Loading…</p>
      </AuthShell>
    );
  }

  if (!signupEnabled) {
    return (
      <AuthShell
        title="Signup disabled"
        subtitle="Staff accounts are created by a system administrator."
      >
        <p className="text-sm text-gray-600">
          Public registration is turned off. Ask your hospital administrator to
          create your account in System Admin, or sign in if you already have
          credentials.
        </p>
        <div className="mt-6 text-center text-sm">
          <Link href="/auth" className="font-medium text-clinical-primary hover:text-clinical-primary-hover">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create account" subtitle="Enter staff details. You can sign in with email or username." >
      <form className="space-y-6" onSubmit={handleSubmit}>
        {message ? (
          <div role="alert" className={`rounded-md border px-4 py-3 text-sm ${isSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
            {message}
          </div>
        ) : null}

        <div className="space-y-1">
          <label htmlFor="name" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-clinical-primary focus:ring-clinical-primary sm:text-sm"
            placeholder="Enter full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          {errors.name ? <p className="text-sm text-red-600">{errors.name.join(" ")}</p> : null}
        </div>

        <div className="space-y-1">
          <label htmlFor="username" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
            Username (used for login)
          </label>
          <input
            id="username"
            name="username"
            type="text"
            className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-clinical-primary focus:ring-clinical-primary sm:text-sm"
            placeholder="Choose a username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
          {errors.username ? <p className="text-sm text-red-600">{errors.username.join(" ")}</p> : null}
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-clinical-primary focus:ring-clinical-primary sm:text-sm"
            placeholder="Enter email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {errors.email ? <p className="text-sm text-red-600">{errors.email.join(" ")}</p> : null}
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
            Password
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              className="block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-clinical-primary focus:ring-clinical-primary sm:text-sm pr-10"
              placeholder="Enter Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800 focus:outline-none cursor-pointer"
            >
              {showPassword ? (
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password ? <p className="text-sm text-red-600">{errors.password.join(" ")}</p> : null}
        </div>

        <button
          type="submit"
          disabled={submitLoading}
          className="w-full rounded-md bg-clinical-primary px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-clinical-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-clinical-primary disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitLoading ? "Creating account..." : "Create account"}
        </button>

        <div className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/auth" className="font-medium text-clinical-primary hover:text-clinical-primary-hover">
            Sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
