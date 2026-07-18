"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PHONES,
  DEFAULT_FILTERS,
  applyFilters,
  NETWORK_OPTIONS,
  DISPLAY_TYPES,
  OS_OPTIONS,
  CHIPSET_BRANDS,
  SIM_OPTIONS,
  BUILD_OPTIONS,
  FORM_FACTORS,
  VIDEO_RES_OPTIONS,
  PRICE_RANGES,
  type Filters,
  type Phone,
} from "@/lib/finderData";
import FormSection from "@/components/finder/FormSection";
import StyledSelect from "@/components/finder/StyledSelect";
import MinMaxSelect from "@/components/finder/MinMaxSelect";
import CheckboxGroup from "@/components/finder/CheckboxGroup";

const currentYear = new Date().getFullYear();
const YEARS: Array<{ value: string; label: string }> = Array.from(
  { length: 14 },
  (_, i) => {
    const y = currentYear - i;
    return { value: String(y), label: String(y) };
  }
);
const SIZE_OPTIONS = Array.from({ length: 21 }, (_, i) => {
  const v = +(i * 0.5).toFixed(1);
  return { value: String(v), label: `${v}"` };
});
const MB_OPTIONS = Array.from({ length: 6 }, (_, i) => {
  const v = i * 500;
  return { value: String(v), label: `${v}+ mAh` };
});
const STORAGE_OPTIONS = [32, 64, 128, 256, 512, 1024].map((v) => ({
  value: String(v),
  label: `${v} GB`,
}));
const RAM_OPTIONS = [4, 6, 8, 12, 16, 24].map((v) => ({
  value: String(v),
  label: `${v} GB`,
}));
const MP_OPTIONS = [5, 8, 12, 16, 24, 32, 48, 64, 108, 200].map((v) => ({
  value: String(v),
  label: `${v} MP`,
}));
const REFRESH_OPTIONS = [
  { value: "0", label: "Any" },
  { value: "60", label: "60 Hz+" },
  { value: "90", label: "90 Hz+" },
  { value: "120", label: "120 Hz+" },
  { value: "144", label: "144 Hz+" },
];
const SELFIE_OPTIONS = [0, 5, 8, 12, 16, 24, 32, 50].map((v) => ({
  value: String(v),
  label: v === 0 ? "Any" : `${v} MP+`,
}));
const CHARGING_OPTIONS = [0, 10, 18, 25, 33, 45, 67, 80, 100, 120].map((v) => ({
  value: String(v),
  label: v === 0 ? "Any" : `${v} W+`,
}));
const PRICE_OPTS = PRICE_RANGES.map((p) => ({ value: p.label, label: p.label }));

const PRICE_RANGE_KEY = (
  label: string
): { min: number; max: number } | null => {
  const m = PRICE_RANGES.find((p) => p.label === label);
  return m ? { min: m.min, max: m.max } : null;
};

function priceOptions() {
  return PRICE_OPTS;
}

interface ResultCardProps {
  phone: Phone;
  index: number;
}

function ResultCard({ phone, index }: ResultCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.025 }}
      className="finder-result"
    >
      <div className="finder-result__image">
        <span className="finder-result__emoji">{phone.imageEmoji}</span>
      </div>
      <div className="finder-result__body">
        <span className="finder-result__brand">{phone.brand}</span>
        <h4 className="finder-result__name">{phone.name}</h4>
        <ul className="finder-result__specs">
          <li>
            <b>{phone.sizeIn}&quot;</b> {phone.displayType}
          </li>
          <li>
            <b>{phone.ramGB}/{phone.storageGB} GB</b>
          </li>
          <li>
            <b>{phone.mainCamMP} MP</b> · {phone.battMAh} mAh
          </li>
        </ul>
        <div className="finder-result__price-row">
          <span className="finder-result__price">
            ${phone.priceUSD.toLocaleString()}
          </span>
          <a className="finder-result__cta" href={`/phones/${phone.id}`}>
            View specs →
          </a>
        </div>
      </div>
    </motion.article>
  );
}

export default function FinderClient() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [priceRangeLabel, setPriceRangeLabel] = useState<string>(
    PRICE_RANGES[0].label
  );
  const [submitted, setSubmitted] = useState(false);

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const toggleIn = <T extends string>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const results = useMemo(() => applyFilters(PHONES, filters), [filters]);

  const handlePrice = (label: string) => {
    setPriceRangeLabel(label);
    const r = PRICE_RANGE_KEY(label);
    if (r) {
      update("priceMin", r.min);
      update("priceMax", r.max);
    }
  };

  const clearAll = () => {
    setFilters(DEFAULT_FILTERS);
    setPriceRangeLabel(PRICE_RANGES[0].label);
    setSubmitted(false);
  };

  const submit = () => setSubmitted(true);

  // Helper to keep JSX clean
  const networkSelected = filters.network as string[];
  const osSelected = filters.os as string[];

  return (
    <div className="finder-theme mx-auto w-full max-w-7xl px-4 pb-20 pt-6 sm:px-6">
      {/* ── Top header ─────────────────────────────────────── */}
      <div className="finder-topbar">
        <div className="finder-topbar__inner">
          <span className="finder-topbar__logo">
            <span className="finder-topbar__logo-mark">GS</span>
            DorDam<span className="finder-topbar__logo-tld">Finder</span>
          </span>
          <nav className="finder-topbar__nav" aria-label="Finder sections">
            {[
              "Network",
              "Launch",
              "Body",
              "Display",
              "Platform",
              "Memory",
              "Camera",
              "Battery",
              "Misc",
            ].map((s) => (
              <a key={s} href={`#sec-${s.toLowerCase()}`} className="finder-topbar__link">
                {s}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Crumbs / page heading ──────────────────────────── */}
      <header className="finder-header">
        <p className="finder-header__crumbs">Home › Phone Finder</p>
        <h1 className="finder-header__title">Phone Finder</h1>
        <p className="finder-header__sub">
          Search the entire database. Pick any combination of filters — networks,
          dimensions, display, chipset, battery, price — and find exactly the
          handset you want.
        </p>
        <div className="finder-header__legend">
          <span className="finder-header__legend-pill">Red = accent</span>
          <span className="finder-header__legend-pill">Grey = neutral</span>
          <span className="finder-header__legend-pill finder-header__legend-pill--dark">
            Zero blue is used in this design
          </span>
        </div>
      </header>

      {/* ── Form sections ──────────────────────────────────── */}
      <div className="finder-form">
        {/* 1. Network */}
        <div id="sec-network" />
        <FormSection
          index={0}
          title="Network"
          subtitle="Select which mobile generations the phone must support."
        >
          <CheckboxGroup
            options={NETWORK_OPTIONS as unknown as string[]}
            selected={networkSelected}
            onToggle={(v) =>
              update("network", toggleIn(filters.network, v as Filters["network"][number]))
            }
          />
        </FormSection>

        {/* 2. Launch */}
        <div id="sec-launch" />
        <FormSection index={1} title="Launch" subtitle="Year of introduction.">
          <MinMaxSelect
            label="Year introduced"
            minValue={String(filters.yearMin)}
            maxValue={String(filters.yearMax)}
            minOptions={YEARS}
            maxOptions={YEARS}
            onMin={(v) => update("yearMin", Math.min(Number(v), filters.yearMax))}
            onMax={(v) =>
              update("yearMax", Math.max(Number(v), filters.yearMin))
            }
          />
        </FormSection>

        {/* 3. Body */}
        <div id="sec-body" />
        <FormSection
          index={2}
          title="Body"
          subtitle="Dimensions, weight, build material, SIM type."
        >
          <div className="finder-grid finder-grid--body">
            <StyledSelect
              label="Thickness (max)"
              value={String(filters.dimensionMax)}
              onChange={(v) => update("dimensionMax", Number(v))}
              options={[
                { value: "200", label: "Any" },
                { value: "8", label: "Under 8 mm" },
                { value: "9", label: "Under 9 mm" },
                { value: "10", label: "Under 10 mm" },
              ]}
            />
            <StyledSelect
              label="Weight (max)"
              value={String(filters.weightMax)}
              onChange={(v) => update("weightMax", Number(v))}
              options={[
                { value: "500", label: "Any" },
                { value: "150", label: "Under 150 g" },
                { value: "180", label: "Under 180 g" },
                { value: "200", label: "Under 200 g" },
                { value: "230", label: "Under 230 g" },
              ]}
            />
            <StyledSelect
              label="Build material"
              value={filters.build}
              onChange={(v) => update("build", v)}
              options={BUILD_OPTIONS.map((b) => ({ value: b, label: b }))}
            />
            <StyledSelect
              label="SIM type"
              value={filters.sim}
              onChange={(v) => update("sim", v)}
              options={SIM_OPTIONS.map((s) => ({ value: s, label: s }))}
            />
          </div>
        </FormSection>

        {/* 4. Display */}
        <div id="sec-display" />
        <FormSection
          index={3}
          title="Display"
          subtitle="Type, size, resolution, refresh rate."
        >
          <div className="finder-grid finder-grid--display">
            <StyledSelect
              label="Panel type"
              value={filters.displayType}
              onChange={(v) => update("displayType", v)}
              options={DISPLAY_TYPES.map((d) => ({ value: d, label: d }))}
            />
            <MinMaxSelect
              label="Screen size"
              minValue={String(filters.sizeMin)}
              maxValue={String(filters.sizeMax)}
              minOptions={SIZE_OPTIONS}
              maxOptions={SIZE_OPTIONS}
              onMin={(v) => update("sizeMin", Math.min(Number(v), filters.sizeMax))}
              onMax={(v) =>
                update("sizeMax", Math.max(Number(v), filters.sizeMin))
              }
            />
            <StyledSelect
              label="Refresh rate"
              value={String(filters.refreshMin)}
              onChange={(v) => update("refreshMin", Number(v))}
              options={REFRESH_OPTIONS}
            />
            <div className="finder-static">
              <span className="finder-static__label">Resolution</span>
              <span className="finder-static__value">HD · FHD · QHD · 4K+</span>
            </div>
          </div>
        </FormSection>

        {/* 5. Platform */}
        <div id="sec-platform" />
        <FormSection
          index={4}
          title="Platform"
          subtitle="Operating systems, chipset family, CPU cores."
        >
          <CheckboxGroup
            label="Operating system"
            options={OS_OPTIONS as unknown as string[]}
            selected={osSelected}
            onToggle={(v) =>
              update("os", toggleIn(filters.os, v as Filters["os"][number]))
            }
          />
          <div className="finder-grid finder-grid--platform">
            <StyledSelect
              label="Chipset family"
              value={filters.chipset}
              onChange={(v) => update("chipset", v)}
              options={CHIPSET_BRANDS.map((c) => ({ value: c, label: c }))}
            />
            <StyledSelect
              label="CPU cores (min)"
              value={String(filters.cpuCoresMin)}
              onChange={(v) => update("cpuCoresMin", Number(v))}
              options={[
                { value: "0", label: "Any" },
                { value: "4", label: "4+" },
                { value: "6", label: "6+" },
                { value: "8", label: "8+" },
              ]}
            />
          </div>
        </FormSection>

        {/* 6. Memory */}
        <div id="sec-memory" />
        <FormSection
          index={5}
          title="Memory"
          subtitle="RAM, internal storage, expandable storage."
        >
          <div className="finder-grid finder-grid--memory">
            <StyledSelect
              label="RAM (min)"
              value={String(filters.ramMin)}
              onChange={(v) => update("ramMin", Number(v))}
              options={[{ value: "0", label: "Any" }, ...RAM_OPTIONS]}
            />
            <StyledSelect
              label="Internal storage (min)"
              value={String(filters.storageMin)}
              onChange={(v) => update("storageMin", Number(v))}
              options={[{ value: "0", label: "Any" }, ...STORAGE_OPTIONS]}
            />
            <label className="finder-toggle">
              <input
                type="checkbox"
                checked={filters.cardSlot}
                onChange={(e) => update("cardSlot", e.target.checked)}
              />
              <span className="finder-toggle__track">
                <span className="finder-toggle__thumb" />
              </span>
              <span className="finder-toggle__label">
                microSD card slot required
              </span>
            </label>
          </div>
        </FormSection>

        {/* 7. Camera */}
        <div id="sec-camera" />
        <FormSection
          index={6}
          title="Main & Selfie Camera"
          subtitle="Megapixel floor and max video resolution."
        >
          <div className="finder-grid finder-grid--camera">
            <StyledSelect
              label="Main camera (min)"
              value={String(filters.mainCamMin)}
              onChange={(v) => update("mainCamMin", Number(v))}
              options={[{ value: "0", label: "Any" }, ...MP_OPTIONS]}
            />
            <StyledSelect
              label="Selfie camera (min)"
              value={String(filters.selfieCamMin)}
              onChange={(v) => update("selfieCamMin", Number(v))}
              options={SELFIE_OPTIONS}
            />
            <StyledSelect
              label="Max video"
              value={filters.videoRes}
              onChange={(v) => update("videoRes", v)}
              options={[
                { value: "Any", label: "Any" },
                ...VIDEO_RES_OPTIONS.map((r) => ({ value: r, label: r })),
              ]}
            />
          </div>
        </FormSection>

        {/* 8. Battery */}
        <div id="sec-battery" />
        <FormSection
          index={7}
          title="Battery"
          subtitle="Capacity and wired charging speed."
        >
          <div className="finder-grid finder-grid--battery">
            <StyledSelect
              label="Battery capacity (min)"
              value={String(filters.battMin)}
              onChange={(v) => update("battMin", Number(v))}
              options={MB_OPTIONS}
            />
            <StyledSelect
              label="Charging speed (min)"
              value={String(filters.chargingMin)}
              onChange={(v) => update("chargingMin", Number(v))}
              options={CHARGING_OPTIONS}
            />
          </div>
        </FormSection>

        {/* 9. Misc */}
        <div id="sec-misc" />
        <FormSection
          index={8}
          title="Misc"
          subtitle="Form factor, headphone jack, price range."
        >
          <div className="finder-grid finder-grid--misc">
            <StyledSelect
              label="Form factor"
              value={filters.formFactor}
              onChange={(v) => update("formFactor", v)}
              options={[
                { value: "Any", label: "Any" },
                ...FORM_FACTORS.map((f) => ({ value: f, label: f })),
              ]}
            />
            <div className="finder-radio">
              <span className="finder-radio__label">3.5 mm headphone jack</span>
              <div className="finder-radio__group">
                {[
                  { v: "any", l: "Any" },
                  { v: "yes", l: "Yes" },
                  { v: "no", l: "No" },
                ].map((o) => (
                  <button
                    type="button"
                    key={o.v}
                    onClick={() => update("jack", o.v as Filters["jack"])}
                    className={`finder-radio__btn ${
                      filters.jack === o.v ? "is-active" : ""
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <StyledSelect
              label="Price range"
              value={priceRangeLabel}
              onChange={handlePrice}
              options={priceOptions()}
            />
          </div>
        </FormSection>
      </div>

      {/* ── Sticky action bar with Show X results ──────────── */}
      <div className="finder-actions">
        <span className="finder-actions__count">
          <strong>{results.length}</strong> phones match
        </span>
        <div className="finder-actions__buttons">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={clearAll}
            className="finder-actions__btn finder-actions__btn--ghost"
          >
            Reset filters
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            onClick={submit}
            className="finder-actions__btn finder-actions__btn--primary"
          >
            Show {results.length} results
          </motion.button>
        </div>
      </div>

      {/* ── Results ────────────────────────────────────────── */}
      <section className="finder-results">
        <header className="finder-results__head">
          <h2>
            {submitted
              ? `${results.length} phones match your filters`
              : `${results.length} phones (preview)`}
          </h2>
          {submitted && results.length > 0 && (
            <span className="finder-results__hint">
              Click a card to open the full spec sheet.
            </span>
          )}
        </header>

        {results.length === 0 ? (
          <div className="finder-empty">
            <span className="finder-empty__icon">🔍</span>
            <p>No phones match your current filters.</p>
            <button onClick={clearAll} className="finder-empty__btn">
              Reset and start over
            </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="finder-results__grid">
              {results.map((p, i) => (
                <ResultCard key={p.id} phone={p} index={i} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </section>
    </div>
  );
}
