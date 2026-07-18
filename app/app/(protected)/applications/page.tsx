import { authorizeChatGPTUser, getChatGPTUser } from "@/app/chatgpt-auth";
import { authorizePrivateCapitalOwner } from "@/src/private-capital/security/authorization";
import { PrivateDomainHub } from "@/src/platform/components/PrivateDomainHub";

export default async function ApplicationsPage() {
  const identity = await getChatGPTUser();
  const workspaceIdentity = identity ? authorizeChatGPTUser(identity) : null;
  const privateCapitalAvailable = authorizePrivateCapitalOwner(workspaceIdentity) !== null;

  return <PrivateDomainHub privateCapitalAvailable={privateCapitalAvailable} />;
}
