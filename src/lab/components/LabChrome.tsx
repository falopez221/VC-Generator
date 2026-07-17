"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/src/components/layout/Header";
import { LabNav } from "./LabNav";

export function LabChrome() {
  const pathname = usePathname();
  return pathname === "/lab/methodology" ? <Header /> : <LabNav />;
}
