import type { Metadata } from "next";
import { LabNav } from "@/src/lab/components/LabNav";
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
      <LabNav />
      {children}
      <footer className="lab-footer"><span>Venture Governance System™ · Public demonstration</span><a href="/lab/methodology">Methodology & limitations</a></footer>
    </div>
  );
}
