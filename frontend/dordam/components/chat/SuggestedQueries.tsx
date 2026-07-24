"use client";

import type { SuggestedQuery as SuggestedQueryT } from "@/types/chat";

// ─────────────────────────────────────────────────────────────────────────
//  SuggestedQueries — starter chips shown when the chat has no messages.
//  Clicking a chip delegates up to the parent; the parent is responsible
//  for feeding the prompt into sendMessage().
// ─────────────────────────────────────────────────────────────────────────

const DEFAULT_QUERIES: SuggestedQueryT[] = [
  {
    id: "best-camera",
    icon: "📸",
    label: "Best camera phones",
    prompt: "Which phones under ৳50,000 have the best camera?",
  },
  {
    id: "budget-gaming",
    icon: "🎮",
    label: "Budget gaming picks",
    prompt: "Suggest a phone under ৳25,000 that's good for gaming.",
  },
  {
    id: "battery-king",
    icon: "🔋",
    label: "Long battery life",
    prompt: "Which phones have the biggest battery and fast charging?",
  },
  {
    id: "compare-flagship",
    icon: "⚖️",
    label: "Compare flagships",
    prompt: "Compare the latest Samsung Galaxy S series and iPhone.",
  },
  {
    id: "value-midrange",
    icon: "💎",
    label: "Best value mid-ranger",
    prompt: "What's the best value mid-range phone in Bangladesh right now?",
  },
];

interface SuggestedQueriesProps {
  queries?: SuggestedQueryT[];
  onPick: (prompt: string) => void;
}

export default function SuggestedQueries({
  queries = DEFAULT_QUERIES,
  onPick,
}: SuggestedQueriesProps) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Try asking
      </p>
      <div className="flex flex-wrap gap-1.5">
        {queries.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onPick(q.prompt)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-slate-200 transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-white"
          >
            {q.icon && <span className="text-[13px]">{q.icon}</span>}
            <span>{q.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { DEFAULT_QUERIES };