"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  index: number;
  children: ReactNode;
}

// Wraps a logical block of the finder form. The left red accent
// rule matches GSMArena's section-divider look. Framer Motion
// handles the stagger-fade-in on first paint.
export default function FormSection({ title, subtitle, index, children }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.06,
        ease: [0.22, 0.61, 0.36, 1],
      }}
      className="finder-section"
    >
      <div className="finder-section__head">
        <span className="finder-section__rule" aria-hidden />
        <div className="finder-section__titles">
          <h3 className="finder-section__title">{title}</h3>
          {subtitle && <p className="finder-section__sub">{subtitle}</p>}
        </div>
      </div>
      <div className="finder-section__body">{children}</div>
    </motion.section>
  );
}