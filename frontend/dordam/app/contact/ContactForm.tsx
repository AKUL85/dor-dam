"use client";

import { useState } from "react";

interface Errors {
  name?: string;
  email?: string;
  message?: string;
}

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const set = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Errors = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "Enter a valid email address.";
    if (form.message.trim().length < 10)
      next.message = "Message must be at least 10 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // No backend yet — acknowledge locally.
    setSent(true);
    setForm({ name: "", email: "", message: "" });
  };

  if (sent) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-[var(--success)]/30 bg-[#e7f6ee] p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success)] text-white">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p className="text-lg font-bold text-[var(--text)]">Message sent!</p>
        <p className="text-sm text-[var(--text-secondary)]">
          Thanks for reaching out. We&apos;ll reply as soon as we can.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-2 text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-[var(--radius-md)] border bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]";

  return (
    <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">
          Name
        </label>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className={`${inputCls} ${errors.name ? "border-[var(--danger)]" : "border-[var(--border)]"}`}
          placeholder="Your name"
        />
        {errors.name && <p className="mt-1 text-xs text-[var(--danger)]">{errors.name}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">
          Email
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          className={`${inputCls} ${errors.email ? "border-[var(--danger)]" : "border-[var(--border)]"}`}
          placeholder="you@example.com"
        />
        {errors.email && <p className="mt-1 text-xs text-[var(--danger)]">{errors.email}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">
          Message
        </label>
        <textarea
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          rows={5}
          className={`${inputCls} resize-y ${errors.message ? "border-[var(--danger)]" : "border-[var(--border)]"}`}
          placeholder="How can we help?"
        />
        {errors.message && <p className="mt-1 text-xs text-[var(--danger)]">{errors.message}</p>}
      </div>

      <button
        type="submit"
        className="rounded-[var(--radius-md)] bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
      >
        Send Message
      </button>
    </form>
  );
}
