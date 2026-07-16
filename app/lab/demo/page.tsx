import type { Metadata } from "next";
import { LabDemo } from "@/src/lab/components/LabDemo";
import { SITE_URL } from "@/src/config/site";

export const metadata: Metadata = {
  title: "Interactive Public Lab — Venture Governance System™",
  description: "Run a limited deterministic multi-agent opportunity exploration with synthetic data and public demonstrative models.",
  alternates: { canonical: `${SITE_URL}/lab/demo` },
};

export default function DemoPage() {
  return <LabDemo />;
}

