// ─────────────────────────────────────────────────────────────────────────
//  TypingIndicator — three pulsing dots used while we wait for the answer.
//  Pure presentational; no props, no state.
// ─────────────────────────────────────────────────────────────────────────

export default function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="Assistant is typing"
      className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-white/[0.06] bg-[#1a2235] px-3.5 py-2.5"
    >
      <span className="sr-only">Typing…</span>
      <Dot delay="0ms" />
      <Dot delay="150ms" />
      <Dot delay="300ms" />
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="block h-1.5 w-1.5 rounded-full bg-slate-400"
      style={{
        animation: "dotPulse 1.2s ease-in-out infinite",
        animationDelay: delay,
      }}
    />
  );
}
