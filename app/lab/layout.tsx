import type { Metadata } from "next";
import { LabChrome } from "@/src/lab/components/LabChrome";
import { SITE_URL } from "@/src/config/site";

export const metadata: Metadata = {
  title: "Public Lab — Venture Governance System™",
  description: "Limited public demonstration of simplified agents, synthetic opportunities and demonstrative quantitative models.",
  alternates: { canonical: `${SITE_URL}/lab` },
};

export default function LabLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="lab-app" lang="en">
      <a className="skip-link" href="#lab-content">Skip to Lab content</a>
      <LabChrome />
      {children}
      <footer className="lab-footer"><span>Venture Governance System™ · Public demonstration · <a href="https://www.scottbuckley.com.au/library/discovery/" target="_blank" rel="noreferrer">“Discovery” by Scott Buckley · CC BY 4.0</a></span><a href="/lab/methodology">Methodology & limitations</a></footer>
    </div>
  );
}
