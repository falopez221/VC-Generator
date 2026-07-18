import type { Metadata } from "next";
import { HumanReviewBoard } from "@/src/lab/review/HumanReviewBoard";

export const metadata: Metadata = {
  title: "Human Review Board | Private Workspace",
  description: "Authenticated human review workspace for governed opportunity classification.",
};

export default function PrivateHumanReviewPage() {
  return <HumanReviewBoard surface="private" />;
}
