import { NextResponse } from "next/server";
import { authorizeChatGPTUser, getChatGPTUser } from "@/app/chatgpt-auth";
import { PRIVATE_AGENT_CATALOG } from "@/src/private/agent-registry/catalog.generated";
import { parseSensitivityLenses, recommendPrivateAgents } from "@/src/private/agent-registry/recommend";
import { BoundedJsonRequestError, isSameSiteWrite, readBoundedJson } from "@/src/private/request-security";

export const dynamic = "force-dynamic";
const MAX_REQUEST_BYTES = 4_000;

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return response({ error: "Authentication is required." }, 401);
  if (!authorizeChatGPTUser(user)) return response({ error: "This account is not authorized for the private workspace." }, 403);
  if (!isSameSiteWrite(request)) return response({ error: "Cross-site private requests are not allowed." }, 403);
  try {
    const body = await readBoundedJson(request, MAX_REQUEST_BYTES) as { prompt?: unknown; lenses?: unknown };
    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 800) : "";
    return response({ prompt, recommendations: recommendPrivateAgents(PRIVATE_AGENT_CATALOG, prompt, parseSensitivityLenses(body.lenses)) });
  } catch (error) {
    if (error instanceof BoundedJsonRequestError) return response({ error: error.message }, error.status);
    return response({ error: "A bounded JSON mission brief is required." }, 400);
  }
}
