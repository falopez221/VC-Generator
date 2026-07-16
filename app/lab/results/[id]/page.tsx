import type { Metadata } from "next";
import { LabResultClient } from "@/src/lab/components/LabResultClient";

export const metadata: Metadata = {
  title: "Public Lab Result — Venture Governance System™",
  robots: { index: false, follow: false },
};

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LabResultClient id={id.slice(0, 120)} />;
}

