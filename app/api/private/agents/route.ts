import { NextResponse } from "next/server";
import { authorizeChatGPTUser, getChatGPTUser } from "@/app/chatgpt-auth";
import { PRIVATE_AGENT_CATALOG, PRIVATE_AGENT_DOMAINS } from "@/src/private/agent-registry/catalog.generated";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
const MAX_QUERY_LENGTH = 100;

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}

function readParam(value: string | null) {
  return (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return response({ error: "Authentication is required." }, 401);
  if (!authorizeChatGPTUser(user)) return response({ error: "This account is not authorized for the private workspace." }, 403);

  const params = new URL(request.url).searchParams;
  const search = readParam(params.get("q")).toLocaleLowerCase();
  const domain = readParam(params.get("domain"));
  const specialization = readParam(params.get("specialization"));
  const requestedPage = Math.max(1, Math.floor(Number(params.get("page")) || 1));
  const filtered = PRIVATE_AGENT_CATALOG.filter((agent) => {
    if (domain && agent.domain !== domain) return false;
    if (specialization && agent.specialization !== specialization) return false;
    if (!search) return true;
    return `${agent.displayName} ${agent.domain} ${agent.specialization} ${agent.capabilitySummary}`.toLocaleLowerCase().includes(search);
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pages);
  const start = (page - 1) * PAGE_SIZE;
  const specializations = [...new Set(PRIVATE_AGENT_CATALOG.filter((agent) => !domain || agent.domain === domain).map((agent) => agent.specialization))].sort((left, right) => left.localeCompare(right, "es"));

  return response({
    total: filtered.length,
    page,
    pages,
    pageSize: PAGE_SIZE,
    domains: PRIVATE_AGENT_DOMAINS,
    specializations,
    items: filtered.slice(start, start + PAGE_SIZE).map((agent) => ({
      id: agent.id,
      name: agent.displayName,
      domain: agent.domain,
      specialization: agent.specialization,
      description: agent.capabilitySummary,
      researchAccess: "Available through protected Research Lab",
      status: "Documented · human-selected",
      execution: "No autonomous execution",
    })),
  });
}
