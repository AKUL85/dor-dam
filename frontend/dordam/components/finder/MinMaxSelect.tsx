"use client";

import StyledSelect from "./StyledSelect";

interface Props {
  label: string;
  minValue: string;
  maxValue: string;
  minOptions: Array<{ value: string; label: string }>;
  maxOptions: Array<{ value: string; label: string }>;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}

// "Min / Max" pair styled as a single labeled row — mirrors the
// GSMArena "From / To" inputs on launch year, screen size, RAM etc.
export default function MinMaxSelect({
  label,
  minValue,
  maxValue,
  minOptions,
  maxOptions,
  onMin,
  onMax,
}: Props) {
  return (
    <div className="finder-minmax">
      <span className="finder-minmax__label">{label}</span>
      <div className="finder-minmax__pair">
        <StyledSelect
          value={minValue}
          onChange={onMin}
          options={minOptions}
          size="sm"
          placeholder="Min"
        />
        <span className="finder-minmax__dash" aria-hidden>–</span>
        <StyledSelect
          value={maxValue}
          onChange={onMax}
          options={maxOptions}
          size="sm"
          placeholder="Max"
        />
      </div>
    </div>
  );
}