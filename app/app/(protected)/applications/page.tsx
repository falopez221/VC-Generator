import { authorizeChatGPTUser, getChatGPTUser } from "@/app/chatgpt-auth";
import { authorizePrivateCapitalOwner } from "@/src/private-capital/security/authorization";
import { evaluateAerialPrivateAuthorization } from "@/src/private-aerial/security/authorization";
import { PrivateDomainHub } from "@/src/platform/components/PrivateDomainHub";

export default async function ApplicationsPage() {
  const identity = await getChatGPTUser();
  const workspaceIdentity = identity ? authorizeChatGPTUser(identity) : null;
  const privateCapitalAvailable = authorizePrivateCapitalOwner(workspaceIdentity) !== null;
  const aerialSimulationAvailable = evaluateAerialPrivateAuthorization(workspaceIdentity).authorized;

  return <PrivateDomainHub privateCapitalAvailable={privateCapitalAvailable} aerialSimulationAvailable={aerialSimulationAvailable} />;
}
