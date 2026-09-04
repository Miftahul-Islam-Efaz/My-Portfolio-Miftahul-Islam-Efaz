import type { Metadata } from "next";
import "@/styles/admin.css";
/* Loaded second on purpose: it corrects layout and density rules in admin.css
   that can only be overridden by source order (see the file header). */
import "@/styles/admin-refine.css";

/**
 * The admin area deliberately does NOT inherit the portfolio shell - no Lenis
 * smooth scroll, no GSAP intro, no WebGL canvas. Those exist to make the
 * portfolio feel like a film; they make a CMS feel broken. A form that fights
 * momentum scrolling while you type is not user-friendly at any frame rate.
 */
export const metadata: Metadata = {
  title: "Admin",
  // Keep the panel out of Google entirely.
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="adm">{children}</div>;
}
