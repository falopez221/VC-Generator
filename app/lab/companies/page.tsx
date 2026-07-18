import type { Metadata } from "next";
import { SITE_URL } from "@/src/config/site";
import { CompanyIntelligenceWorkbench } from "@/src/lab/components/CompanyIntelligenceWorkbench";

export const metadata: Metadata = {
  title: "Company Intelligence Workbench — Venture Governance System™",
  description: "Deterministic public analysis of supplied financial statements, earnings-call excerpts, fair-value assumptions and negative beta.",
  alternates: { canonical: `${SITE_URL}/lab/companies` },
};

export default function CompanyIntelligencePage() {
  return <CompanyIntelligenceWorkbench />;
}
