// ─────────────────────────────────────────────────────────────────────────
//  Shared types for the DorDam RAG chat widget.
//
//  Wire format assumptions (matching the backend `api/routers/chat.py`):
//    POST {API_BASE}/chat          → { answer, recommendedPhones?, sources? }
//    Body:    { message: string, history?: ChatHistoryEntry[] }
//    History: [{ role: "user" | "assistant", content: string }]
// ─────────────────────────────────────────────────────────────────────────

export type Role = "user" | "assistant";

/** A single turn in the chat, used both for display and as the history payload. */
export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  /** Phones surfaced by the RAG layer alongside this answer (assistant only). */
  recommendedPhones?: RecommendedPhone[];
  /** True when this is a synthetic message describing a network/server error. */
  isError?: boolean;
  /** ISO timestamp — used purely for ordering / display. */
  createdAt: string;
}

/** Compact phone card tailored for chat-bubble rendering. */
export interface RecommendedPhone {
  id?: string | number | null;
  slug?: string;
  name: string;
  brand?: string;
  price?: string | number | null;
  image?: string | null;
  /** One-line rationale produced by the assistant for why this phone was suggested. */
  reason?: string;
}

/** Trimmed history entry sent on each request — only role + content. */
export interface ChatHistoryEntry {
  role: Role;
  content: string;
}

/** Request body posted to `/chat`. */
export interface ChatRequest {
  message: string;
  history?: ChatHistoryEntry[];
}

/** Response payload from the backend. */
export interface ChatResponse {
  answer: string;
  recommendedPhones?: RecommendedPhone[];
  sources?: Array<{ id?: string | number; title?: string; url?: string }>;
}

/** Suggested starter queries shown when the panel is empty. */
export interface SuggestedQuery {
  id: string;
  label: string;
  /** The full prompt that gets sent when the user picks this chip. */
  prompt: string;
  /** Optional emoji or short glyph rendered on the chip. */
  icon?: string;
}

/** Subset of PhoneCard fields reused when rendering a recommended card. */
export interface PhoneLite {
  slug: string;
  name: string;
  brand: string;
  image: string | null;
  priceHint?: string | null;
  releaseYear?: number | null;
}
