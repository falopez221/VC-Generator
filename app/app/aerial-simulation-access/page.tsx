import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthorizedChatGPTUser } from "@/app/chatgpt-auth";
import {
  AERIAL_SIMULATION_ROOT,
  evaluateAerialPrivateAuthorization,
  sanitizeAerialReturnPath,
} from "@/src/private-aerial/security/authorization";
import { hasAerialLabAccessConfiguration } from "@/src/private-aerial/security/session";
import { IntelligenceGraph } from "@/src/platform/components/IntelligenceGraph";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Defense lab access",
  description: "Second credential boundary for the restricted simulation workspace.",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

type Props = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "The lab credential was not accepted. Check it and try again.",
  rate: "Too many failed attempts. Wait a few minutes before trying again.",
  request: "The access request could not be verified. Reload this page and try again.",
  configuration: "This lab is sealed until its dedicated server credentials are configured.",
};

export default async function AerialSimulationAccessPage({ searchParams }: Props) {
  const user = await requireAuthorizedChatGPTUser("/app/aerial-simulation-access");
  const authorization = evaluateAerialPrivateAuthorization(user);
  if (!authorization.authorized) redirect("/app/login?reason=aerial-private");

  const parameters = await searchParams;
  const returnTo = sanitizeAerialReturnPath(parameters.next);
  const configured = hasAerialLabAccessConfiguration();
  const errorMessage = parameters.error ? ERROR_MESSAGES[parameters.error] : undefined;

  return (
    <main className="access-page" lang="en">
      <section className="access-copy">
        <Link className="access-brand" href="/app">VENTURE GOVERNANCE SYSTEM</Link>
        <p>DEDICATED LAB CREDENTIAL</p>
        <h1>Unlock the defense simulation lab.</h1>
        <p className="access-lede">
          Your private workspace session is already valid. This lab requires a second,
          separate credential that is verified only on the server.
        </p>

        <div className="access-credential" aria-label="Defense lab access status">
          <div>
            <span>LAB SESSION</span>
            <strong>{configured ? "SEALED" : "NOT CONFIGURED"}</strong>
          </div>
          <dl>
            <div><dt>Workspace identity</dt><dd>Verified</dd></div>
            <div><dt>Lab credential</dt><dd>Required again</dd></div>
            <div><dt>Session</dt><dd>4-hour maximum</dd></div>
          </dl>
          <p>
            A successful verification creates a signed, HttpOnly session bound to the
            current workspace identity. Credential material is never returned to the browser.
          </p>
        </div>

        {errorMessage && <p className="access-denied" role="alert">{errorMessage}</p>}

        <form className="access-request-form" method="post" action="/api/private/aerial-simulation/session">
          <input type="hidden" name="next" value={returnTo} />
          <label htmlFor="aerial-lab-credential">
            Defense lab credential
            <input
              id="aerial-lab-credential"
              name="credential"
              type="password"
              minLength={20}
              maxLength={256}
              autoComplete="current-password"
              spellCheck={false}
              required
              disabled={!configured}
              autoFocus={configured}
            />
          </label>
          <button type="submit" disabled={!configured}>Verify lab credential</button>
          <p>Only the dedicated lab key works here; the general workspace identity is not a substitute.</p>
        </form>

        <div className="access-actions">
          <Link href="/app">Return to private workspace</Link>
          <Link href={AERIAL_SIMULATION_ROOT}>Check lab session</Link>
        </div>

        <aside>
          <span>ACCESS MODEL</span>
          <p>Private workspace session + dedicated lab allowlist + separate lab credential.</p>
          <p>All three checks are enforced server-side and fail closed.</p>
        </aside>
      </section>

      <section className="access-visual">
        <div className="access-visual-status" aria-hidden="true">
          <span>DEFENSE LAB</span>
          <strong>LOCKED</strong>
        </div>
        <IntelligenceGraph variant="access" compact title="Layered private access architecture" />
      </section>
    </main>
  );
}
