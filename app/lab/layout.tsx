import type { Metadata } from "next";
import { LabChrome } from "@/src/lab/components/LabChrome";
import { SITE_URL } from "@/src/config/site";

export const metadata: Metadata = {
  title: "Public Lab — Venture Governance System™",
  description: "Limited public demonstration of simplified agents, synthetic opportunities and demonstrative quantitative models.",
  alternates: { canonical: `${SITE_URL}/lab` },
};

export default function LabLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="lab-app" lang="en"><a className="skip-link" href="#lab-content">Skip to Lab content</a><LabChrome />{children}<footer className="lab-footer"><span>Venture Governance System™ · Public demonstration · Original score cycle by Scott Buckley: <a href="https://www.scottbuckley.com.au/library/decoherence/" target="_blank" rel="noreferrer">Decoherence</a>, <a href="https://www.scottbuckley.com.au/library/computations/" target="_blank" rel="noreferrer">Computations</a>, <a href="https://www.scottbuckley.com.au/library/adrift-among-infinite-stars/" target="_blank" rel="noreferrer">Adrift</a> · CC BY 4.0</span><a href="/lab/methodology">Methodology & limitations</a></footer></div>;
}
