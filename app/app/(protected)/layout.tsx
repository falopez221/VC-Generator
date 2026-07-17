import { requireAuthorizedChatGPTUser } from "@/app/chatgpt-auth";
import { AppShell } from "@/src/platform/components/AppShell";

export const dynamic = "force-dynamic";

export default async function ProtectedPlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthorizedChatGPTUser("/app");
  return <AppShell user={user}>{children}</AppShell>;
}
