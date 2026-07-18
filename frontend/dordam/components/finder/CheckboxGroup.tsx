"use client";

import { motion } from "framer-motion";

interface Option {
  value: string;
  label: string;
}

interface Props {
  label?: string;
  options: Array<string | Option>;
  selected: string[];
  onToggle: (value: string) => void;
  layout?: "row" | "grid";
  cols?: number;
}

// Compact checkbox strip. Each option has a tactile hover/scale
// animation. The `selected` prop carries the active set so the
// parent owns the state — easier to wire to URL params later.
export default function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
  layout = "row",
  cols = 4,
}: Props) {
  const normalised: Option[] = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  return (
    <div className="finder-checks">
      {label && <span className="finder-checks__label">{label}</span>}
      <div
        className="finder-checks__list"
        data-layout={layout}
        style={
          layout === "grid"
            ? ({ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } as React.CSSProperties)
            : undefined
        }
      >
        {normalised.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <motion.button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 360, damping: 24 }}
              className={`finder-chip ${active ? "is-active" : ""}`}
              aria-pressed={active}
            >
              <span className="finder-chip__box" aria-hidden>
                {active ? "✓" : ""}
              </span>
              {opt.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}