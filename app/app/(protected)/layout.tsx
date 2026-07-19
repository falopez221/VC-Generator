import { requireAuthorizedChatGPTUser } from "@/app/chatgpt-auth";
import { AppShell } from "@/src/platform/components/AppShell";
import { authorizePrivateCapitalOwner } from "@/src/private-capital/security/authorization";
import { evaluateAerialPrivateAuthorization } from "@/src/private-aerial/security/authorization";

export const dynamic = "force-dynamic";

export default async function ProtectedPlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthorizedChatGPTUser("/app");
  const privateCapitalAccess = authorizePrivateCapitalOwner(user) !== null;
  const aerialSimulationAccess = evaluateAerialPrivateAuthorization(user).authorized;
  return <AppShell user={user} privateCapitalAccess={privateCapitalAccess} aerialSimulationAccess={aerialSimulationAccess}>{children}</AppShell>;
}
