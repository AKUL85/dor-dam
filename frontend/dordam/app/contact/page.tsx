import type { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact — DorDam",
  description: "Get in touch with the DorDam team.",
};

export default function ContactPage() {
  return (
    <div className="animate-fade-in mx-auto max-w-3xl">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-sm)]">
        <h1 className="text-3xl font-extrabold text-[var(--text)]">Contact Us</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Have a question, correction, or partnership idea? Send us a message and
          we&apos;ll get back to you.
        </p>
        <ContactForm />
      </div>
    </div>
  );
}
