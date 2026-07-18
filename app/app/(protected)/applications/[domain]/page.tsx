import { notFound } from "next/navigation";
import { getDomainWorkspace } from "@/src/applications/domain-workspaces";
import { DomainWorkspaceDashboard } from "@/src/platform/components/DomainWorkspaceDashboard";

export default async function DomainWorkspacePage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const workspace = getDomainWorkspace(domain);
  if (!workspace) notFound();
  return <DomainWorkspaceDashboard workspace={workspace} />;
}
