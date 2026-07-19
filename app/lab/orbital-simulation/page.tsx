import type { Metadata } from "next";
import { SITE_URL } from "@/src/config/site";
import { OrbitalLaunchLab } from "@/src/lab/components/OrbitalLaunchLab";
import "@/src/styles/orbital-simulation.css";

export const metadata: Metadata = {
  title: "Simulación de lanzamiento orbital sintético | Venture Governance System™",
  description: "Laboratorio público, determinista y no operacional para observar un ascenso orbital ficticio y el despliegue visual de una nave.",
  alternates: { canonical: `${SITE_URL}/lab/orbital-simulation` },
  openGraph: {
    title: "Orbital Launch Lab | Venture Governance System™",
    description: "Simulación sintética, reproducible y no operacional de un lanzamiento orbital ficticio.",
    url: `${SITE_URL}/lab/orbital-simulation`,
    images: [{ url: `${SITE_URL}/og-orbital-launch-lab.png`, width: 1733, height: 907 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orbital Launch Lab | Venture Governance System™",
    description: "Ascenso, separación, inserción y despliegue en una simulación pública acotada.",
    images: [`${SITE_URL}/og-orbital-launch-lab.png`],
  },
};

export default function OrbitalSimulationPage() {
  return <OrbitalLaunchLab />;
}
