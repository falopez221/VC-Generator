import type { Metadata } from "next";
import { PrivateAerialSimulation } from "@/src/platform/components/PrivateAerialSimulation";
import "@/src/styles/aerial-simulation.css";

export const metadata: Metadata = {
  title: "Private Aerial Simulation | Venture Governance System™",
  description:
    "Authenticated, deterministic and non-operational aerial resilience simulation using synthetic normalized data.",
  robots: { index: false, follow: false, nocache: true },
};

export default function PrivateAerialSimulationPage() {
  return <PrivateAerialSimulation />;
}
