import { redirect } from "next/navigation";
import {
  chatGPTSignInPath,
  authorizeChatGPTUser,
  getChatGPTUser,
} from "@/app/chatgpt-auth";
import {
  evaluatePrivateCapitalAuthorization,
  sanitizePrivateCapitalReturnPath,
  type PrivateCapitalOwner,
} from "./authorization.ts";
import { recordPrivateCapitalAccess } from "./access-ledger.ts";

/**
 * Page/layout guard for the Private Capital subtree.
 *
 * API routes should obtain the trusted identity with getChatGPTUser() and
 * evaluate the same dedicated authorization decision, returning 401/403.
 */
export async function requirePrivateCapitalOwner(
  returnTo: string,
): Promise<PrivateCapitalOwner> {
  const safeReturnTo = sanitizePrivateCapitalReturnPath(returnTo);
  const identity = await getChatGPTUser();
  if (!identity) {
    recordPrivateCapitalAccess({
      outcome: "denied",
      reason: "identity_missing",
      route: safeReturnTo,
    });
    redirect(chatGPTSignInPath(safeReturnTo));
    throw new Error("Private Capital authentication redirect did not terminate the request.");
  }

  const workspaceIdentity = authorizeChatGPTUser(identity);
  if (!workspaceIdentity) {
    recordPrivateCapitalAccess({
      outcome: "denied",
      reason: "owner_not_authorized",
      actorEmail: identity.email,
      route: safeReturnTo,
    });
    redirect("/app/login?reason=private-capital-not-authorized");
    throw new Error("Private Capital base authorization redirect did not terminate the request.");
  }

  const decision = evaluatePrivateCapitalAuthorization(workspaceIdentity);
  if (decision.authorized) {
    recordPrivateCapitalAccess({
      outcome: "allowed",
      reason: "owner_authorized",
      actorEmail: decision.owner.email,
      route: safeReturnTo,
    });
    return decision.owner;
  }

  recordPrivateCapitalAccess({
    outcome: "denied",
    reason: decision.reason,
    actorEmail: identity.email,
    route: safeReturnTo,
  });
  redirect("/app/login?reason=private-capital-not-authorized");
  throw new Error("Private Capital authorization redirect did not terminate the request.");
}
