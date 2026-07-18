# Security operations

## Cloudflare email alert

The application deliberately does not send security alerts directly to an arbitrary email address. That would require an authenticated email provider and would create another outbound attack surface. Configure the alert at the Cloudflare edge instead:

1. In Cloudflare, confirm that the production hostname is **proxied** (orange cloud).
2. Open **Notifications**, select **Add**, choose **WAF / Security Events Alert**, and scope it to this zone.
3. Replace the non-deliverable placeholder `security-alerts@venture-governance.invalid` with a monitored organizational mailbox, set it as the destination, filter for the **Block** action where the plan permits it, and save the policy.
4. Review **Security > Events** whenever an alert arrives; retain evidence before changing a rule.

Cloudflare email notifications are available on Free plans, while WAF security-event spike alerts are available on Business and Enterprise. Such alerts are anomaly notifications, not one email per blocked request: Cloudflare evaluates five-minute buckets and applies a threshold and baseline calculation. Keep Cloudflare account recovery and MFA enabled, and verify that `noreply@notify.cloudflare.com` is not filtered by the organization mailbox.

## Application controls

- Public research uses a fixed provider, strict request/response size limits, timeouts, concurrency limits, and no user-supplied URL fetching.
- Private routes require authenticated authorization, same-site browser writes, bounded JSON bodies, per-user per-instance rate limits, bounded rate-limit memory, and a per-instance active-run guard. Distributed enforcement belongs at the edge.
- The private LLM execution runtime is not shipped in this repository. Unconfigured private execution fails closed and makes no provider call.
- No private catalog generator, profile import pipeline, routing logic, prompt or provider credential is shipped in this public repository.
- Security headers are emitted by both the standalone Next deployment and the Cloudflare Worker.
- The editable Windows build binds both its launcher and application server to `127.0.0.1`, marks installed mode explicitly, validates its non-deliverable `.invalid` local identity, strips hop-by-hop and spoofable forwarding headers, and bounds request headers, URLs, bodies, and timeouts.
- Sites identity headers may be trusted only when `VG_TRUST_CHATGPT_AUTH_HEADERS=1` and `VG_TRUSTED_SITES_HOSTS` lists the exact production authority behind the Sites dispatcher. The dispatcher and Worker must remove or overwrite every inbound `oai-authenticated-user-*` header before establishing identity. Never add preview, `workers.dev`, origin or generic proxy hosts; disable their direct access with edge routing/WAF controls.
- In-memory application rate limits are per process or isolate. Enforce distributed request and concurrency limits at the edge for every public and authenticated API route.
- Make the Security CI workflow a required branch check. Enable repository secret scanning, push protection and dependency alerts; investigate rather than blindly merging automated updates.
- The ignored `work/agent-library-source` inventory is private material, not build input. `npm pack` intentionally fails while it remains under the public repository tree; move it to approved encrypted, access-controlled storage before packaging or sharing the repository directory.

## Historical repository sanitization

Removing a sensitive file from the current tree does not remove its Git blobs, old release archives, CI artifacts or deployed bundles. Do not treat a remote repository as sanitized until an authorized maintainer has:

1. made a protected backup and mapped every branch, tag, release and deployment that may retain the removed private catalog, runtime or legacy whitepaper;
2. used `git filter-repo` or an equivalent reviewed history-rewrite procedure to remove the sensitive paths and matching blobs from every ref;
3. coordinated a force-push, deleted obsolete refs/releases/artifacts/caches, retired old deployments and required collaborators to discard or re-clone historical copies;
4. verified the rewritten remote with `git rev-list --objects --all`, a fresh clone, the public/private boundary checker and a fresh production build; and
5. rotated any credential found during that review, even if it was later deleted.

History rewriting is intentionally not automated by this repository because it is destructive and requires coordination with every remote and collaborator.

These controls reduce abuse and impact; they do not make an internet service impossible to attack. Cloudflare WAF, DDoS protection, bot controls, logs, alerts, dependency updates, and periodic review remain required operational controls.

## Windows installer integrity

The installer always creates a fresh application build; it cannot repackage a cached `.next` tree through a skip flag. It accepts only Node.js 22.13.0 or newer with a valid Authenticode signature from OpenJS Foundation or Microsoft, and emits a sibling `.sha256` file for the completed installer. A SHA-256 value proves integrity only when the expected value is obtained through a separate trusted, authenticated channel; a checksum distributed beside a replaced binary does not prove who published it.

Production installers must be Authenticode-signed and timestamped with an organization-controlled code-signing certificate. Because signing changes the executable, sign first and then regenerate and publish the SHA-256 checksum from the signed file.
