"use client";

import AuthShell from "./AuthShell";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../store/RoleContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default function AuthPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitLoading(true);
    setMessage(null);
    setErrors({});

    const payload = {
      username,
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
        login(data.token, data.user);
      }
    } catch (error) {
      setMessage("Unable to reach authentication service.");
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <AuthShell title="Sign in" subtitle="Enter your staff credentials.">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide" htmlFor="username">
            Email or username
          </label>
          <div className="mt-1">
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:border-[#00a651] focus:ring-[#00a651] sm:text-sm text-gray-900 font-mono"
              placeholder="Enter email or username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
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
              type="password"
              autoComplete="current-password"
              className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:border-[#00a651] focus:ring-[#00a651] sm:text-sm text-gray-900 font-mono pr-10"
              placeholder="Enter Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-500">
            <input
              type="checkbox"
              className="h-4 w-4 text-[#00a651] border-gray-300 rounded cursor-pointer focus:ring-[#00a651]"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Remember this device
          </label>
          <Link href="/auth/forgot-password" className="text-sm font-medium text-[#0ea5e9] hover:text-[#0288c4]">
            Forgot password?
          </Link>
        </div>

        {message ? (
          <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            {message}
            {Object.keys(errors).length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-600">
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
          className="w-full flex justify-center rounded-md bg-[#00a651] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#048f47] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00a651] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="text-center text-sm text-gray-500">
        <Link href="/auth/signup" className="font-medium text-[#0ea5e9] hover:text-[#0288c4]">
          Create account
        </Link>
      </div>
    </AuthShell>
  );
}
