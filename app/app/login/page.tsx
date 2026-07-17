import Link from "next/link";
import { getChatGPTUser, chatGPTSignInPath, authorizeChatGPTUser } from "@/app/chatgpt-auth";
import { IntelligenceGraph } from "@/src/platform/components/IntelligenceGraph";

export const dynamic = "force-dynamic";

export default async function PlatformLoginPage() {
  const user = await getChatGPTUser();
  const authorized = user ? authorizeChatGPTUser(user) : null;
  return <main className="access-page" lang="en"><section className="access-copy"><Link className="access-brand" href="/">VENTURE GOVERNANCE SYSTEM™</Link><p>AUTHORIZED PLATFORM ACCESS</p><h1>Enter a governed decision intelligence workspace.</h1><p className="access-lede">Access missions, agent and model libraries, governed simulations and traceable decision records.</p><div className="access-actions">{authorized ? <Link className="access-primary" href="/app">Continue as {authorized.displayName} →</Link> : user ? <Link className="access-primary" href="/request-access">Request authorization →</Link> : <a className="access-primary" href={chatGPTSignInPath("/app")}>Sign in securely with ChatGPT →</a>}<Link href="/request-access">Request access</Link><Link href="/">Return to public site</Link></div>{user && !authorized && <p className="access-denied" role="status">Signed in as {user.email}, but this account is not on the server-side workspace allowlist.</p>}<ul><li>Provider-managed identity</li><li>Server-verified authorization</li><li>Human authority preserved</li></ul><aside><span>ACCESS MODEL</span><p>Sign in is handled by ChatGPT, so Venture Governance never receives or stores a password. Workspace access is checked separately against a server-side allowlist. Persistent invitations, organization membership and enterprise SSO remain planned until a durable authorization backend is connected.</p></aside></section><section className="access-visual"><IntelligenceGraph variant="access" compact title="Protected workspace architecture" /></section></main>;
}
