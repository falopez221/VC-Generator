import type { Metadata } from "next";
import { requirePrivateCapitalOwner } from "@/src/private-capital/security/server";
import "@/src/styles/private-capital.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Restricted workspace",
  description: "Owner-authorized decision-support workspace.",
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

export default async function PrivateCapitalLayout({ children }: { children: React.ReactNode }) {
  await requirePrivateCapitalOwner("/app/private-capital-intelligence");
  return children;
}
