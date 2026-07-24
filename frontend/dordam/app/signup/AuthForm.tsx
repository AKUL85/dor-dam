"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  mode: "login" | "signup";
}

/**
 * Functional auth form with real client-side validation.
 * NOTE: There is no auth backend yet (per project scope), so a valid
 * submit shows a success state instead of creating a session. When an
 * auth API lands, replace the body of `handleSubmit` — the validation
 * and UI stay as-is.
 */
export default function AuthForm({ mode }: Props) {
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (isSignup && name.trim().length < 2) e.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address.";
    if (password.length < 6) e.password = "Password must be at least 6 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    // No auth backend yet — acknowledge the valid submission locally.
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-md py-16 text-center animate-fade-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e7f6ee] text-[var(--success)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-xl font-extrabold text-[var(--text)]">
          {isSignup ? "Account details validated" : "Signed in (demo)"}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Authentication isn&apos;t wired to a backend yet, so this is a demo confirmation.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const field =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]";

  return (
    <div className="mx-auto max-w-md py-10 animate-fade-in">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <h1 className="text-2xl font-extrabold text-[var(--text)]">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {isSignup
            ? "Join DorDam to save phones and comparisons."
            : "Log in to continue to DorDam."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {isSignup && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={field}
                placeholder="Your name"
              />
              {errors.name && <p className="mt-1 text-xs text-[var(--danger)]">{errors.name}</p>}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-[var(--danger)]">{errors.email}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
              placeholder="••••••••"
            />
            {errors.password && <p className="mt-1 text-xs text-[var(--danger)]">{errors.password}</p>}
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-bold text-white transition hover:bg-[var(--accent-hover)]"
          >
            {isSignup ? "Create account" : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
          {isSignup ? "Already have an account? " : "New to DorDam? "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-semibold text-[var(--accent)] hover:underline"
          >
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
