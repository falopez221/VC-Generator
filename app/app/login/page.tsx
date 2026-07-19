import Link from "next/link";
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser, authorizeChatGPTUser } from "@/app/chatgpt-auth";
import { evaluateAerialPrivateAuthorization } from "@/src/private-aerial/security/authorization";
import { IntelligenceGraph } from "@/src/platform/components/IntelligenceGraph";

export const dynamic = "force-dynamic";

export default async function PlatformLoginPage({ searchParams }: { searchParams?: { reason?: string } }) {
  const user = await getChatGPTUser();
  const authorized = user ? authorizeChatGPTUser(user) : null;
  const isAerialScope = searchParams?.reason === "aerial-private";
  const aerialAuthorization = isAerialScope && authorized
    ? evaluateAerialPrivateAuthorization(authorized)
    : null;
  const scopeAuthorized = Boolean(authorized && (!isAerialScope || aerialAuthorization?.authorized));
  const credentialState = scopeAuthorized ? "ACCESS GRANTED" : user ? "ACCESS DENIED" : "SEALED";
  const privateHint = isAerialScope
    ? "The defense lab uses a dedicated allowlist and then requests its own separate credential."
    : "This workspace uses a dedicated private allowlist.";

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
          {scopeAuthorized && authorized ? (
            <Link className="access-primary" href={isAerialScope ? "/app/aerial-simulation-access" : "/app"}>
              {isAerialScope ? "Continue to lab verification" : `Continue as ${authorized.displayName}`} -&gt;
            </Link>
          ) : user ? (
            <a className="access-primary" href={chatGPTSignOutPath("/app/login")}>Switch identity -&gt;</a>
          ) : (
            <a className="access-primary" href={chatGPTSignInPath("/app")}>Verify private credential -&gt;</a>
          )}
          <Link href="/">Return to public site</Link>
        </div>

        {user && !authorized && (
          <p className="access-denied" role="status">
            Signed in as {user.email}, but this account is not on the server-side allowlist for this private area.
          </p>
        )}
        {isAerialScope && authorized && !aerialAuthorization?.authorized && (
          <p className="access-denied" role="status">
            Your private workspace identity is valid, but it is not on the server-side allowlist for the defense lab.
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
            Identity verification is handled by the hosting platform, so Venture Governance never receives or stores a password.
            {isAerialScope ? (
              " The defense lab applies its own allowlist first, then verifies a separate lab credential before issuing a short-lived session."
            ) : (
              " Workspace access is checked separately against a server-side owner allowlist. A verified identity that does not match the authorized owner remains outside every private application."
            )}
          </p>
          <p>{privateHint}</p>
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
