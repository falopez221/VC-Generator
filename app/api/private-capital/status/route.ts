import { NextResponse } from "next/server";
import { authorizeChatGPTUser, getChatGPTUser } from "@/app/chatgpt-auth";
import { evaluatePrivateCapitalAuthorization } from "@/src/private-capital/security/authorization";
import { recordPrivateCapitalAccess } from "@/src/private-capital/security";
import { SIMULATED_DATA_WARNING } from "@/src/private-capital/data";

export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "private, no-store, max-age=0",
      pragma: "no-cache",
      expires: "0",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "x-robots-tag": "noindex, nofollow, noarchive",
    },
  });
}

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) {
    recordPrivateCapitalAccess({
      outcome: "denied",
      reason: "identity_missing",
      route: "/api/private-capital/status",
    });
    return response({ error: "Authentication is required." }, 401);
  }

  const workspaceIdentity = authorizeChatGPTUser(identity);
  if (!workspaceIdentity) {
    recordPrivateCapitalAccess({
      outcome: "denied",
      reason: "owner_not_authorized",
      actorEmail: identity.email,
      route: "/api/private-capital/status",
    });
    return response({ error: "This account is not authorized for this workspace." }, 403);
  }

  const decision = evaluatePrivateCapitalAuthorization(workspaceIdentity);
  if (!decision.authorized) {
    recordPrivateCapitalAccess({
      outcome: "denied",
      reason: decision.reason,
      actorEmail: identity.email,
      route: "/api/private-capital/status",
    });
    return response({ error: "This account is not authorized for this workspace." }, 403);
  }

  recordPrivateCapitalAccess({
    outcome: "allowed",
    reason: "owner_authorized",
    actorEmail: decision.owner.email,
    route: "/api/private-capital/status",
  });
  return response({
    role: decision.owner.role,
    execution: "disabled",
    providers: {
      market: "simulated",
      macro: "simulated",
      news: "simulated",
      bitcoinOnChain: "simulated",
      broker: "not_connected",
      notifications: "in_app_only",
      persistence: "not_connected",
    },
    notice: SIMULATED_DATA_WARNING,
  });
}
