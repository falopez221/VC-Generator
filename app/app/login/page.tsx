import Link from "next/link";
import { getChatGPTUser, chatGPTSignInPath, authorizeChatGPTUser } from "@/app/chatgpt-auth";
import { IntelligenceGraph } from "@/src/platform/components/IntelligenceGraph";

export const dynamic = "force-dynamic";

export default async function PlatformLoginPage() {
  const user = await getChatGPTUser();
  const authorized = user ? authorizeChatGPTUser(user) : null;
  const credentialState = authorized ? "AUTHORIZED" : user ? "ALLOWLIST REQUIRED" : "SEALED";

  return (
    <main className="access-page" lang="en">
      <section className="access-copy">
        <Link className="access-brand" href="/">VENTURE GOVERNANCE SYSTEM</Link>
        <p>PRIVATE CREDENTIAL BOUNDARY</p>
        <h1>Enter the protected command layer.</h1>
        <p className="access-lede">
          Identity is verified before the workspace opens. Missions, agents, models and decision records
          remain behind a server-side authorization gate.
        </p>

        <div className="access-credential" aria-label="Private credential status">
          <div>
            <span>ACCESS TOKEN</span>
            <strong>{credentialState}</strong>
          </div>
          <dl>
            <div>
              <dt>Identity</dt>
              <dd>Provider managed</dd>
            </div>
            <div>
              <dt>Workspace</dt>
              <dd>Server verified</dd>
            </div>
            <div>
              <dt>Secrets</dt>
              <dd>Never stored here</dd>
            </div>
          </dl>
          <p>Credential material is redacted. This public surface shows the boundary, not the private authentication implementation.</p>
        </div>

        <div className="access-actions">
          {authorized ? (
            <Link className="access-primary" href="/app">Continue as {authorized.displayName} -&gt;</Link>
          ) : user ? (
            <Link className="access-primary" href="/request-access">Request authorization -&gt;</Link>
          ) : (
            <a className="access-primary" href={chatGPTSignInPath("/app")}>Sign in securely with ChatGPT -&gt;</a>
          )}
          <Link href="/request-access">Request access</Link>
          <Link href="/">Return to public site</Link>
        </div>

        {user && !authorized && (
          <p className="access-denied" role="status">
            Signed in as {user.email}, but this account is not on the server-side workspace allowlist.
          </p>
        )}

        <ul>
          <li>Provider-managed identity</li>
          <li>Server-verified authorization</li>
          <li>Human authority preserved</li>
        </ul>

        <aside>
          <span>ACCESS MODEL</span>
          <p>
            Sign in is handled by ChatGPT, so Venture Governance never receives or stores a password.
            Workspace access is checked separately against a server-side allowlist. Persistent invitations,
            organization membership and enterprise SSO remain planned until a durable authorization backend is connected.
          </p>
        </aside>
      </section>

      <section className="access-visual">
        <div className="access-visual-status" aria-hidden="true">
          <span>PRIVATE SURFACE</span>
          <strong>LOCKED</strong>
        </div>
        <IntelligenceGraph variant="access" compact title="Protected credential architecture" />
      </section>
    </main>
  );
}
