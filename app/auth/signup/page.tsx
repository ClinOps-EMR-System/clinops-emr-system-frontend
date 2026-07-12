"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "../AuthShell";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    } catch (error) {
      setMessage("Unable to reach authentication service.");
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <AuthShell title="Create account" subtitle="Enter staff details. You can sign in with email or username." >
      <form className="space-y-6" onSubmit={handleSubmit}>
        {message ? (
          <div className={`rounded-md px-4 py-3 text-sm ${isSuccess ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
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
            className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-[#00a651] focus:ring-[#00a651] sm:text-sm"
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
            className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-[#00a651] focus:ring-[#00a651] sm:text-sm"
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
            className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-[#00a651] focus:ring-[#00a651] sm:text-sm"
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
          <input
            id="password"
            name="password"
            type="password"
            className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:border-[#00a651] focus:ring-[#00a651] sm:text-sm"
            placeholder="Enter Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
          {errors.password ? <p className="text-sm text-red-600">{errors.password.join(" ")}</p> : null}
        </div>

        <button
          type="submit"
          disabled={submitLoading}
          className="w-full rounded-md bg-[#00a651] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#048f47] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00a651] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitLoading ? "Creating account..." : "Create account"}
        </button>

        <div className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/" className="font-medium text-[#0ea5e9] hover:text-[#0288c4]">
            Sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
