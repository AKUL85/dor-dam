import React from "react";

interface SpecTableProps {
  specs: Record<string, Record<string, string>>;
}

// Preferred display order for GSMArena-style spec sections.
const SECTION_ORDER = [
  "Network", "Launch", "Body", "Display", "Platform", "Memory",
  "Main Camera", "Selfie camera", "Sound", "Comms", "Features",
  "Battery", "Misc", "Our Tests", "EU LABEL",
];

function sortSections(specs: Record<string, Record<string, string>>) {
  return Object.keys(specs).sort((a, b) => {
    const ia = SECTION_ORDER.indexOf(a);
    const ib = SECTION_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/** Full specification table, grouped by section (Network, Body, Display…). */
export default function SpecTable({ specs }: SpecTableProps) {
  const sections = sortSections(specs);

  if (sections.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--text-muted)]">
        No specifications available.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {sections.map((section) => {
            const rows = Object.entries(specs[section]);
            if (rows.length === 0) return null;
            return rows.map(([key, value], rowIndex) => (
              <tr
                key={`${section}-${key}`}
                className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-2)]"
              >
                {rowIndex === 0 && (
                  <th
                    rowSpan={rows.length}
                    className="w-24 border-r border-[var(--border)] bg-[var(--accent-soft)] p-3 text-left align-top text-xs font-bold uppercase tracking-wider text-[var(--accent)] sm:w-32"
                  >
                    {section}
                  </th>
                )}
                <td className="w-32 border-r border-[var(--border)] p-3 align-top font-medium text-[var(--text-muted)] sm:w-48">
                  {key}
                </td>
                <td className="p-3 align-top text-[var(--text)]">{value}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}
