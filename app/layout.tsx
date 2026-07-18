import type { Metadata } from "next";
import "./globals.css";
import { SITE_METADATA, SITE_URL } from "@/src/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_METADATA.title,
  description: SITE_METADATA.description,
  alternates: { canonical: SITE_METADATA.canonical },
  openGraph: {
    title: SITE_METADATA.title,
    description: SITE_METADATA.description,
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    images: [{ url: "/og-agent-field.png", width: 1731, height: 909, alt: "Venture Governance System — 1,920 synthetic signals routed through four public specialists to human authority" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_METADATA.title,
    description: SITE_METADATA.description,
    images: ["/og-agent-field.png"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
