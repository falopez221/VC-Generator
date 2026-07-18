import type { Metadata } from "next";
import { ValuationDashboard } from "@/src/lab/components/ValuationDashboard";
import { SITE_URL } from "@/src/config/site";

export const metadata: Metadata = {
  title: "Evidence-Bounded Valuation | Venture Governance System™",
  description: "An auditable, scenario-based valuation of the implemented Venture Governance prototype and its conditional future options.",
  alternates: { canonical: `${SITE_URL}/lab/valuation` },
  openGraph: {
    title: "Evidence-Bounded Valuation | Venture Governance System™",
    description: "Value what exists. Gate what might.",
    url: `${SITE_URL}/lab/valuation`,
    images: [{ url: `${SITE_URL}/og-valuation.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Evidence-Bounded Valuation | Venture Governance System™",
    description: "Current economic value separated from conditional future options.",
    images: [`${SITE_URL}/og-valuation.png`],
  },
};

export default function ValuationPage() {
  return <ValuationDashboard />;
}
