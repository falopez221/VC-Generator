import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform | Venture Governance System™",
  description: "Authenticated decision intelligence workspace for governed missions, evidence, models and human review.",
  robots: { index: false, follow: false, nocache: true },
};

export default function PlatformRootLayout({ children }: { children: React.ReactNode }) { return children; }
