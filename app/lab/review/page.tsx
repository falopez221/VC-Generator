import type { Metadata } from "next";
import { HumanReviewBoard } from "@/src/lab/review/HumanReviewBoard";
import { SITE_URL } from "@/src/config/site";

export const metadata: Metadata = {
  title: "Human Review Board | Venture Governance System",
  description: "A human-controlled review environment for evaluating and classifying synthetic venture opportunities.",
  alternates: { canonical: `${SITE_URL}/lab/review` },
};

export default function HumanReviewBoardPage() {
  return <HumanReviewBoard />;
}
