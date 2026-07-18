"use client";

import { memo, useMemo } from "react";
import type { ChatMessage as ChatMessageT, RecommendedPhone } from "@/types/chat";

// ─────────────────────────────────────────────────────────────────────────
//  ChatMessage — renders a single user/assistant bubble.
//
//  Assistant bubbles:
//    • Markdown body via lightweight formatter (no extra deps).
//    • Optional recommended-phone cards inline under the answer.
//  User bubbles:
//    • Plain text, right-aligned.
// ─────────────────────────────────────────────────────────────────────────

interface ChatMessageProps {
  message: ChatMessageT;
}

function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-500/15 px-3.5 py-2.5 text-sm text-slate-100 ring-1 ring-blue-500/20">
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div
        className={`max-w-[90%] rounded-2xl rounded-tl-sm border px-3.5 py-2.5 text-sm leading-relaxed ${
          message.isError
            ? "border-red-500/30 bg-red-500/10 text-red-200"
            : "border-white/[0.06] bg-[#1a2235] text-slate-100"
        }`}
      >
        <MarkdownLite source={message.content} />
      </div>

      {message.recommendedPhones && message.recommendedPhones.length > 0 && (
        <div className="grid w-full max-w-[90%] grid-cols-1 gap-2 sm:grid-cols-2">
          {message.recommendedPhones.slice(0, 4).map((phone, i) => (
            <RecommendedPhoneCard key={phone.id ?? phone.slug ?? i} phone={phone} />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(ChatMessage);

// ─────────────────────────────────────────────────────────────────────────
//  MarkdownLite — converts a tiny subset of Markdown to React nodes.
//  Supports: **bold**, *italic*, `code`, [text](url), and newlines.
//  This keeps the chat dependency-free while still feeling rich.
// ─────────────────────────────────────────────────────────────────────────

function MarkdownLite({ source }: { source: string }) {
  const html = useMemo(() => renderInlineMarkdown(source), [source]);
  return (
    <div
      className="chat-markdown break-words [&_a]:text-blue-400 [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:bg-white/[0.06] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_p]:m-0 [&_p+_p]:mt-1.5 [&_strong]:font-semibold [&_strong]:text-white [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5"
      // The output is sanitized inside `renderInlineMarkdown` before being injected.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── minimal, safe markdown → HTML ──────────────────────────────────────
// We escape HTML first, then re-introduce only the markdown markers we support.
// Order matters: process code spans, bold, italic, links, then paragraphs/lists.

const ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => ESCAPE[c]);
}

function renderInlineMarkdown(src: string): string {
  let s = escapeHtml(src);

  // Code spans: `…`
  s = s.replace(/`([^`\n]+)`/g, (_m, code) => `<code>${code}</code>`);

  // Bold: **…**
  s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");

  // Italic: *…* (single asterisks, after bold)
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");

  // Links: [text](url)
  s = s.replace(
    /\[([^\]\n]+)\]\(([^)\s]+)\)/g,
    (_m, text, url) =>
      `<a href="${url.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer">${text}</a>`,
  );

  // Bulleted lists: lines starting with "- " or "* "
  const lines = s.split(/\n/);
  const out: string[] = [];
  let listOpen = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (!listOpen) {
        out.push("<ul>");
        listOpen = true;
      }
      out.push(`<li>${bullet[1]}</li>`);
    } else {
      if (listOpen) {
        out.push("</ul>");
        listOpen = false;
      }
      if (line === "") {
        out.push("");
      } else {
        out.push(`<p>${line}</p>`);
      }
    }
  }
  if (listOpen) out.push("</ul>");

  return out.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────
//  RecommendedPhoneCard — compact card inside the chat bubble grid.
//  Mirrors the look of `components/PhoneCard.tsx` but stays self-contained.
// ─────────────────────────────────────────────────────────────────────────

function RecommendedPhoneCard({ phone }: { phone: RecommendedPhone }) {
  const href = phone.slug ? `/phones/${phone.slug}` : "#";
  const priceLabel =
    typeof phone.price === "number"
      ? `৳${phone.price.toLocaleString()}`
      : phone.price ?? null;

  return (
    <a
      href={href}
      className="group flex items-center gap-3 overflow-hidden rounded-xl border border-white/[0.06] bg-[#1a2235] p-2.5 transition-all hover:border-blue-500/30 hover:bg-[#1f2942]"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-800/40">
        {phone.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={phone.image}
            alt={phone.name}
            className="h-full w-full object-contain p-1"
            loading="lazy"
          />
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-slate-500"
          >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {phone.brand && (
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-blue-400">
            {phone.brand}
          </p>
        )}
        <p className="truncate text-[13px] font-semibold text-white group-hover:text-blue-300">
          {phone.name}
        </p>
        {priceLabel && (
          <p className="mt-0.5 truncate text-[11px] font-medium text-emerald-400/80">
            {priceLabel}
          </p>
        )}
        {phone.reason && (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">
            {phone.reason}
          </p>
        )}
      </div>
    </a>
  );
}