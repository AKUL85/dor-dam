"use client";

import type { ChangeEvent } from "react";

interface Props {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
  size?: "sm" | "md";
  placeholder?: string;
}

// Dense dropdown styled in GSMArena's compact form style.
export default function StyledSelect({
  label,
  value,
  onChange,
  options,
  className = "",
  size = "md",
  placeholder,
}: Props) {
  const handle = (e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value);
  return (
    <label className={`finder-select ${className}`} data-size={size}>
      {label && <span className="finder-select__label">{label}</span>}
      <span className="finder-select__wrap">
        <select value={value} onChange={handle} className="finder-select__el">
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="finder-select__chev" aria-hidden>
          ▾
        </span>
      </span>
    </label>
  );
}