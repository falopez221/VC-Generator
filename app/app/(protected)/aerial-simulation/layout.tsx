import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthorizedChatGPTUser } from "@/app/chatgpt-auth";
import {
  AERIAL_SIMULATION_ACCESS_PATH,
  AERIAL_SIMULATION_ROOT,
  evaluateAerialPrivateAuthorization,
} from "@/src/private-aerial/security/authorization";
import { hasValidAerialLabSession } from "@/src/private-aerial/security/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Restricted simulation workspace",
  description: "Credential-protected synthetic simulation workspace.",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default async function AerialSimulationProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuthorizedChatGPTUser(AERIAL_SIMULATION_ROOT);
  const authorization = evaluateAerialPrivateAuthorization(user);
  if (!authorization.authorized) {
    redirect("/app/login?reason=aerial-private");
  }
  if (!await hasValidAerialLabSession(authorization.email)) {
    redirect(`${AERIAL_SIMULATION_ACCESS_PATH}?next=${encodeURIComponent(AERIAL_SIMULATION_ROOT)}`);
  }

  return <>{children}</>;
}
