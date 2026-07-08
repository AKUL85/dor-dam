import React from "react";

interface SpecTableProps {
  specs: Record<string, Record<string, string>>;
}

// Preferred order
const SECTION_ORDER = [
  "Network", "Launch", "Body", "Display", "Platform", "Memory",
  "Main Camera", "Selfie camera", "Sound", "Comms", "Features",
  "Battery", "Misc", "Our Tests", "EU LABEL",
];

function sortSections(specs: Record<string, Record<string, string>>) {
  const keys = Object.keys(specs);
  return keys.sort((a, b) => {
    const ia = SECTION_ORDER.indexOf(a);
    const ib = SECTION_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export default function SpecTable({ specs }: SpecTableProps) {
  const sections = sortSections(specs);

  if (sections.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        No specifications available.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#1a2235]">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {sections.map((section) => {
            const rows = Object.entries(specs[section]);
            if (rows.length === 0) return null;
            return rows.map(([key, value], rowIndex) => (
              <tr key={`${section}-${key}`} className="border-b border-white/[0.06] hover:bg-white/[0.02]">
                {rowIndex === 0 && (
                  <th
                    rowSpan={rows.length}
                    className="w-24 align-top p-3 text-left font-bold text-blue-400 uppercase tracking-wider text-xs bg-black/20 border-r border-white/[0.06] sm:w-32"
                  >
                    {section}
                  </th>
                )}
                <td className="w-32 p-3 font-medium text-slate-400 border-r border-white/[0.06] sm:w-48 align-top">
                  {key}
                </td>
                <td className="p-3 text-slate-200 align-top">{value}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}
