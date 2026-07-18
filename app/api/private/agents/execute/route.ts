import { NextResponse } from "next/server";
import { authorizeChatGPTUser, getChatGPTUser } from "@/app/chatgpt-auth";
import { executePrivateAgentTeam, PrivateAgentExecutionError, privateAgentRuntimeStatus } from "@/src/private/agent-execution";
import { BoundedJsonRequestError, isSameSiteWrite, readBoundedJson } from "@/src/private/request-security";

export const dynamic = "force-dynamic";
const attempts = new Map<string, number[]>();
const MAX_TRACKED_IDENTITIES = 500;
const MAX_ACTIVE_RUNS = 2;
const MAX_REQUEST_BYTES = 20_000;
let activeRuns = 0;

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}

async function authorizedUser() {
  const user = await getChatGPTUser();
  return user ? authorizeChatGPTUser(user) : null;
}

export async function GET() {
  const user = await authorizedUser();
  if (!user) return response({ error: "Authentication and private workspace authorization are required." }, 401);
  return response(privateAgentRuntimeStatus());
}

export async function POST(request: Request) {
  const user = await authorizedUser();
  if (!user) return response({ error: "Authentication and private workspace authorization are required." }, 401);
  if (!isSameSiteWrite(request)) return response({ error: "Cross-site private requests are not allowed." }, 403);
  if (!consumeRateLimit(user.email)) return response({ error: "Private execution rate limit reached. Wait one minute before starting another team run." }, 429);
  if (activeRuns >= MAX_ACTIVE_RUNS) return response({ error: "Private execution is busy. Try again shortly." }, 429);
  try {
    const body = await readBoundedJson(request, MAX_REQUEST_BYTES);
    activeRuns += 1;
    try {
      return response(await executePrivateAgentTeam(body));
    } finally {
      activeRuns -= 1;
    }
  } catch (reason) {
    if (reason instanceof PrivateAgentExecutionError) return response({ error: reason.message }, reason.status);
    if (reason instanceof BoundedJsonRequestError) return response({ error: reason.message }, reason.status);
    return response({ error: "The private agent team failed safely." }, 500);
  }
}

function consumeRateLimit(identity: string) {
  const now = Date.now();
  for (const [key, values] of attempts) {
    if (!values.some((value) => now - value < 60_000)) attempts.delete(key);
  }
  const recent = (attempts.get(identity) ?? []).filter((value) => now - value < 60_000);
  if (recent.length >= 5) return false;
  if (!attempts.has(identity) && attempts.size >= MAX_TRACKED_IDENTITIES) attempts.delete(attempts.keys().next().value ?? "");
  recent.push(now);
  attempts.set(identity, recent);
  return true;
}
