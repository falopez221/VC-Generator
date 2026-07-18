import { NextResponse } from "next/server";
import { authorizeChatGPTUser, getChatGPTUser } from "@/app/chatgpt-auth";
import { PRIVATE_PRODUCT_BOUNDARY } from "@/src/platform/private-product-boundary";

export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" },
  });
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return response({ error: "Authentication is required." }, 401);
  if (!authorizeChatGPTUser(user)) return response({ error: "This account is not authorized for the private workspace." }, 403);

  return response({
    error: "Individual private-agent profiles are intentionally unavailable in the public repository.",
    total: 0,
    page: 1,
    pages: 1,
    pageSize: 0,
    domains: [],
    subdomains: [],
    functions: [],
    items: [],
    boundary: PRIVATE_PRODUCT_BOUNDARY,
  }, 503);
}
