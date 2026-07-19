import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Platform | Venture Governance System™",
  description: "Authenticated decision intelligence workspace for governed missions, evidence, models and human review.",
  alternates: null,
  openGraph: null,
  twitter: null,
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function PlatformRootLayout({ children }: { children: React.ReactNode }) { return children; }
