"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ChatHistoryEntry,
  type ChatMessage,
  type ChatRequest,
  type ChatResponse,
  type Role,
} from "@/types/chat";
import { API_BASE } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────
//  useChat — client-side state machine for the RAG chat panel.
//
//  Responsibilities:
//    • Holds the message log, loading flag, and last error.
//    • sendMessage() appends the user bubble, posts to the backend, then
//      appends the assistant bubble (or an error bubble).
//    • Exposes clearHistory() so the panel header can reset the conversation.
//    • Aborts any in-flight fetch on unmount to avoid setState-after-unmount.
// ─────────────────────────────────────────────────────────────────────────

const MAX_HISTORY_TURNS = 10; // pairs of user/assistant messages kept on the wire

function newId(): string {
  // crypto.randomUUID is available in modern browsers; fall back just in case.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function trimHistory(msgs: ChatMessage[]): ChatHistoryEntry[] {
  // Take only the last N turns and strip client-only fields.
  const tail = msgs.slice(-MAX_HISTORY_TURNS * 2);
  return tail.map((m) => ({ role: m.role, content: m.content }));
}

interface UseChatResult {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearHistory: () => void;
  /** Cancel any in-flight request (used when the panel closes). */
  abort: () => void;
}

export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref so abort() works without re-binding on every render.
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // Always tear down any pending request when the consumer unmounts.
  useEffect(() => {
    return () => abort();
  }, [abort]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      abort(); // cancel any prior request before starting a new one

      const userMsg: ChatMessage = {
        id: newId(),
        role: "user" as Role,
        content: trimmed,
        createdAt: new Date().toISOString(),
      };

      // Append user bubble immediately for snappy UX.
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      // Build the request body using the *current* messages snapshot via
      // setMessages' functional updater so we don't need to read state here.
      let history: ChatHistoryEntry[] = [];
      setMessages((prev) => {
        history = trimHistory(prev);
        return prev;
      });

      const body: ChatRequest = { message: trimmed, history };

      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Chat request failed: ${res.status}`);
        }

        const data = (await res.json()) as ChatResponse;

        const assistantMsg: ChatMessage = {
          id: newId(),
          role: "assistant" as Role,
          content: data.answer?.trim() || "I couldn't find a confident answer for that.",
          recommendedPhones: data.recommendedPhones ?? [],
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") {
          // User dismissed or sent another message — silent.
          return;
        }
        const msg =
          err instanceof Error ? err.message : "Unexpected error talking to the assistant.";
        setError(msg);
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant" as Role,
            content:
              "Sorry — I had trouble reaching the assistant just now. Please try again in a moment.",
            isError: true,
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [loading, abort],
  );

  const clearHistory = useCallback(() => {
    abort();
    setMessages([]);
    setError(null);
    setLoading(false);
  }, [abort]);

  return { messages, loading, error, sendMessage, clearHistory, abort };
}
