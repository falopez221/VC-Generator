import { NextResponse } from "next/server";
import { authorizeChatGPTUser, getChatGPTUser } from "@/app/chatgpt-auth";
import { PRIVATE_PRODUCT_BOUNDARY, PRIVATE_RUNTIME_STATUS } from "@/src/platform/private-product-boundary";
import { isSameSiteWrite } from "@/src/private/request-security";
import { resolveTenantAccess } from "@/src/private-access/tenant-authorization";

export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" },
  });
}

async function authorizedUser() {
  const user = await getChatGPTUser();
  return user ? authorizeChatGPTUser(user) : null;
}

export async function GET(request: Request) {
  const user = await authorizedUser();
  if (!user) return response({ error: "Authentication and private workspace authorization are required." }, 401);
  const tenant = resolveTenantAccess(user, "private-agent-runtime", request.headers.get("x-vg-tenant"));
  if (!tenant) return response({ error: "This tenant is not entitled to the private agent runtime." }, 403);
  return response({ ...PRIVATE_RUNTIME_STATUS, ...PRIVATE_PRODUCT_BOUNDARY, executionConfigured: false, tenant: tenant.tenantId });
}

export async function POST(request: Request) {
  const user = await authorizedUser();
  if (!user) return response({ error: "Authentication and private workspace authorization are required." }, 401);
  if (!isSameSiteWrite(request)) return response({ error: "Cross-site private requests are not allowed." }, 403);
  const tenant = resolveTenantAccess(user, "private-agent-runtime", request.headers.get("x-vg-tenant"));
  if (!tenant) return response({ error: "This tenant is not entitled to the private agent runtime." }, 403);

  return response({
    error: "Private-agent execution is intentionally unavailable in the public repository.",
    boundary: PRIVATE_PRODUCT_BOUNDARY,
    tenant: tenant.tenantId,
  }, 503);
}
