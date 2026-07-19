import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthorizedChatGPTUser } from "@/app/chatgpt-auth";
import {
  AERIAL_SIMULATION_ROOT,
  evaluateAerialPrivateAuthorization,
} from "@/src/private-aerial/security/authorization";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aerial simulation access",
  description: "Owner-restricted synthetic simulation workspace.",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

/**
 * Compatibility route for old bookmarks. The hosting identity and dedicated
 * owner allowlist are the only active access checks; no second secret is kept.
 */
export default async function AerialSimulationAccessPage() {
  const user = await requireAuthorizedChatGPTUser(AERIAL_SIMULATION_ROOT);
  const authorization = evaluateAerialPrivateAuthorization(user);
  if (!authorization.authorized) redirect("/app/login?reason=aerial-private");
  redirect(AERIAL_SIMULATION_ROOT);
}
