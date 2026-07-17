import type { Metadata } from "next";
import { Header } from "@/src/components/layout/Header";
import { Footer } from "@/src/components/layout/Footer";
import { ApplicationsPageClient } from "@/src/applications/components/ApplicationsPageClient";
import { SITE_URL } from "@/src/config/site";

const title = "Applications | Venture Governance System™";
const description = "Explore how Venture Governance coordinates specialized agents, evidence, mathematical models and human oversight across venture capital, strategy, science, government, infrastructure and other complex domains.";

export const metadata: Metadata = { title, description, alternates: { canonical: `${SITE_URL}/applications` }, openGraph: { title, description, type: "website", url: `${SITE_URL}/applications`, images: [{ url: "/og-public-v2.png", width: 1731, height: 909, alt: "Venture Governance application intelligence" }] }, twitter: { card: "summary_large_image", title, description, images: ["/og-public-v2.png"] } };

export default function ApplicationsPage() {
  return <><a className="skip-link" href="#applications-content">Skip to applications</a><Header /><ApplicationsPageClient /><Footer /></>;
}

