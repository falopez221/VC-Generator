import { NextResponse } from "next/server";
import { authorizeChatGPTUser, getChatGPTUser } from "@/app/chatgpt-auth";
import { PRIVATE_PRODUCT_BOUNDARY } from "@/src/platform/private-product-boundary";
import { isSameSiteWrite } from "@/src/private/request-security";
import { resolveTenantAccess } from "@/src/private-access/tenant-authorization";

export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" },
  });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return response({ error: "Authentication is required." }, 401);
  const workspaceUser = authorizeChatGPTUser(user);
  if (!workspaceUser) return response({ error: "This account is not authorized for the private workspace." }, 403);
  if (!isSameSiteWrite(request)) return response({ error: "Cross-site private requests are not allowed." }, 403);
  const tenant = resolveTenantAccess(workspaceUser, "private-agent-runtime", request.headers.get("x-vg-tenant"));
  if (!tenant) return response({ error: "This tenant is not entitled to the private agent runtime." }, 403);

  return response({
    error: "Private-agent routing is intentionally unavailable in the public repository.",
    boundary: PRIVATE_PRODUCT_BOUNDARY,
    tenant: tenant.tenantId,
  }, 503);
}
