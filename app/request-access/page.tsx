import type { Metadata } from "next";
import { Header } from "@/src/components/layout/Header";
import { Footer } from "@/src/components/layout/Footer";
import { AccessRequestForm } from "@/src/platform/components/AccessRequestForm";

export const metadata: Metadata = {
  title: "Request Access | Venture Governance System™",
  description: "Prepare an access request for a future Venture Governance workspace.",
  alternates: { canonical: "/request-access" },
};

export default function RequestAccessPage() { return <><Header /><main className="request-access-page" lang="en"><section><p>PLATFORM ACCESS</p><h1>Request an authorized workspace.</h1><p>Tell us which decision or institutional workflow you want to support. This public form prepares an email draft; it does not store or transmit your information through a backend.</p></section><AccessRequestForm /></main><Footer /></>; }
