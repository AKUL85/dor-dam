"use client";

import { useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────
//  ChatInput — auto-growing textarea with smart Enter handling.
//
//   • Enter       → submit
//   • Shift+Enter → newline
//   • Esc         → blur (lets the user dismiss the keyboard quickly)
//
//  The parent controls `value` (controlled) so the panel can clear it on
//  send. We auto-grow up to ~6 lines before letting it scroll.
// ─────────────────────────────────────────────────────────────────────────

interface ChatInputProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  placeholder?: string;
  /** Optional id used by external <label htmlFor>. */
  id?: string;
}

const MAX_HEIGHT_PX = 160; // ~6 lines at 14px / 1.5 line-height

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  loading = false,
  placeholder = "Ask about phones, specs, or prices…",
  id = "chat-input",
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea up to MAX_HEIGHT_PX then scroll internally.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!loading && value.trim()) onSubmit();
    } else if (e.key === "Escape") {
      e.currentTarget.blur();
    }
  };

  const canSend = !loading && value.trim().length > 0;

  return (
    <div className="flex items-end gap-2 border-t border-white/[0.06] bg-[var(--bg-secondary)] p-3">
      <label htmlFor={id} className="sr-only">
        Ask the DorDam assistant
      </label>
      <textarea
        id={id}
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={loading}
        className="flex-1 resize-none rounded-lg border border-white/[0.08] bg-[#151d2e] px-3 py-2 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 disabled:opacity-60 custom-scrollbar"
        style={{ maxHeight: MAX_HEIGHT_PX }}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSend}
        aria-label="Send message"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white transition hover:bg-blue-600 active:bg-blue-700 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-slate-500"
      >
        {loading ? (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        )}
      </button>
    </div>
  );
}