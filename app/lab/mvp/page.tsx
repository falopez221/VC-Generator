import type { Metadata } from "next";
import { MvpLab } from "@/src/lab/components/MvpLab";
import { SITE_URL } from "@/src/config/site";

export const metadata: Metadata = {
  title: "MVP Validation Lab — Venture Governance System™",
  description: "Human-gated, deterministic public MVP validation briefs and static prototype previews for selected synthetic opportunities.",
  alternates: { canonical: `${SITE_URL}/lab/mvp` },
  openGraph: { images: [{ url: `${SITE_URL}/og-mvp-lab.png`, width: 1200, height: 630, alt: "Venture Governance System MVP Validation Lab" }] },
};

export default function MvpPage() {
  return <MvpLab />;
}
