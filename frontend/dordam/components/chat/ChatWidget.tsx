"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChatPanel from "./ChatPanel";

// ─────────────────────────────────────────────────────────────────────────
//  ChatWidget — fixed-positioned entry point mounted once in `app/layout.tsx`.
//
//  • Floating circular button bottom-right; click toggles the panel.
//  • Panel sizes itself responsively (full-screen on mobile, 380×560 on desktop).
//  • `prefers-reduced-motion` disables the spring animation.
//  • Esc closes the panel.
// ─────────────────────────────────────────────────────────────────────────

const MOBILE_BREAKPOINT = 640;

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();

  // Esc closes the panel when it's open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* ── Floating launcher button ──────────────────────────────── */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open AI assistant"}
        aria-expanded={open}
        aria-controls="dordam-chat-panel"
        whileTap={{ scale: 0.94 }}
        animate={
          reducedMotion
            ? {}
            : {
                boxShadow: open
                  ? "0 12px 30px rgba(59, 130, 246, 0.25)"
                  : [
                      "0 8px 24px rgba(59, 130, 246, 0.20)",
                      "0 8px 32px rgba(59, 130, 246, 0.35)",
                      "0 8px 24px rgba(59, 130, 246, 0.20)",
                    ],
              }
        }
        transition={
          reducedMotion
            ? { duration: 0 }
            : { boxShadow: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }
        }
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg ring-1 ring-blue-400/40 transition hover:from-blue-400 hover:to-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:bottom-6 sm:right-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.svg
              key="close"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </motion.svg>
          ) : (
            <motion.svg
              key="chat"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M8 9h8" />
              <path d="M8 13h5" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="dordam-chat-panel"
            initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={
              isMobile
                ? "fixed inset-0 z-40 p-2"
                : "fixed bottom-24 right-5 z-40 h-[560px] w-[380px] sm:right-6"
            }
          >
            <ChatPanel onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}