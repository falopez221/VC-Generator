import type { Metadata } from "next";
import { SITE_URL } from "@/src/config/site";
import { AerialSimulationLab } from "@/src/lab/components/AerialSimulationLab";
import "@/src/styles/aerial-simulation.css";

export const metadata: Metadata = {
  title: "Synthetic Aerial Resilience Simulation | Venture Governance System™",
  description: "A deterministic, non-operational public simulation of noisy virtual observations, estimation, uncertainty and abstract capacity.",
  alternates: { canonical: `${SITE_URL}/lab/simulation` },
  openGraph: {
    title: "Synthetic Aerial Resilience Simulation | Venture Governance System™",
    description: "A deterministic public Lab for normalized observations, state estimation, uncertainty and abstract capacity.",
    url: `${SITE_URL}/lab/simulation`,
    images: [{ url: `${SITE_URL}/og-aerial-simulation.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Synthetic Aerial Resilience Simulation | Venture Governance System™",
    description: "Synthetic, academic and non-operational by design.",
    images: [`${SITE_URL}/og-aerial-simulation.png`],
  },
};

export default function AerialSimulationPage() {
  return <AerialSimulationLab />;
}
