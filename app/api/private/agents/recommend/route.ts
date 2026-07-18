import { NextResponse } from "next/server";
import { authorizeChatGPTUser, getChatGPTUser } from "@/app/chatgpt-auth";
import { PRIVATE_PRODUCT_BOUNDARY } from "@/src/platform/private-product-boundary";
import { isSameSiteWrite } from "@/src/private/request-security";

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
  if (!authorizeChatGPTUser(user)) return response({ error: "This account is not authorized for the private workspace." }, 403);
  if (!isSameSiteWrite(request)) return response({ error: "Cross-site private requests are not allowed." }, 403);

  return response({
    error: "Private-agent routing is intentionally unavailable in the public repository.",
    boundary: PRIVATE_PRODUCT_BOUNDARY,
  }, 503);
}
