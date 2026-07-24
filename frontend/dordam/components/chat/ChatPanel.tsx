"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import SuggestedQueries from "./SuggestedQueries";
import TypingIndicator from "./TypingIndicator";
import { useChat } from "@/hooks/useChat";

// ─────────────────────────────────────────────────────────────────────────
//  ChatPanel — the actual conversation surface.
//
//  Layout (top → bottom):
//    1. Header with brand, status indicator, clear + close buttons.
//    2. Scrollable message list (auto-scrolls to bottom on new messages).
//    3. Footer with input + (optionally) suggested queries above it.
//
//  Uses framer-motion for mount/unmount so the widget feels springy without
//  disturbing the surrounding layout (it's `position: fixed`).
// ─────────────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  onClose: () => void;
}

export default function ChatPanel({ onClose }: ChatPanelProps) {
  const { messages, loading, error, sendMessage, clearHistory } = useChat();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message whenever the log changes.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void sendMessage(text);
  };

  const handleSuggestedPick = (prompt: string) => {
    setDraft("");
    void sendMessage(prompt);
  };

  const hasMessages = messages.length > 0;

  return (
    <motion.div
      role="dialog"
      aria-label="DorDam AI assistant"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--bg-secondary)] shadow-2xl shadow-black/50"
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] bg-[var(--bg-card)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 ring-1 ring-blue-500/30">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-blue-400"
            >
              <path d="M12 2 14.39 8.26 21 9.27l-5 4.87L17.18 21 12 18.27 6.82 21 8 14.14l-5-4.87 6.61-1.01L12 2Z" />
            </svg>
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[var(--bg-card)]" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              DorDam Assistant
            </p>
            <p className="truncate text-[11px] text-[var(--text-muted)]">
              {loading ? "Thinking…" : "Online · powered by your catalog"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {hasMessages && (
            <button
              type="button"
              onClick={clearHistory}
              aria-label="Clear chat history"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-white/[0.05] hover:text-white"
              title="Clear chat"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-white/[0.05] hover:text-white"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="custom-scrollbar flex-1 overflow-y-auto bg-[var(--bg-primary)] px-4 py-4"
      >
        {!hasMessages ? (
          <div className="flex h-full flex-col items-start justify-center gap-4">
            <div className="rounded-xl border border-white/[0.06] bg-[#1a2235] px-4 py-3 text-sm text-slate-300">
              👋 Hi! Ask me anything about phones in our catalog — specs, prices, comparisons, or recommendations.
            </div>
            <SuggestedQueries onPick={handleSuggestedPick} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {loading && <TypingIndicator />}
            {error && !loading && messages[messages.length - 1]?.isError === undefined && (
              <p className="text-center text-[11px] text-red-400">{error}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Footer / Input ──────────────────────────────────────────── */}
      <ChatInput
        value={draft}
        onChange={setDraft}
        onSubmit={submit}
        loading={loading}
      />
    </motion.div>
  );
}