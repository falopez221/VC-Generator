# Authenticated platform preview

Venture Governance now separates the public institutional surface from an authenticated platform preview under `/app`. This repository still does **not** contain the private product, extended agent network, proprietary orchestration, production datasets or enterprise control plane.

## Surfaces and routes

- Public: `/`, `/applications`, `/lab`, `/lab/demo`, `/lab/methodology` and `/request-access`.
- Access: `/app/login`, using Sites dispatch-owned Sign in with ChatGPT.
- Protected preview: `/app` and its Missions, Mission Builder, Applications, Decision Lab, Simulation, Scenarios, Research, Portfolio, bounded Red Team review, Knowledge Graph, Agent Library, Model Library, Evidence Library, Governance, Audit, System Health, Documentation and Settings routes.

The protected routes are server-rendered and check both identity and authorization before returning workspace HTML.

## Authentication and authorization

Authentication and authorization are intentionally separate:

1. Sign in with ChatGPT identifies the current user through Sites dispatcher headers only when the server operator explicitly sets `VG_TRUST_CHATGPT_AUTH_HEADERS=1` and allowlists the exact production authority in `VG_TRUSTED_SITES_HOSTS`.
2. `authorizeChatGPTUser()` checks the normalized email against a server-side allowlist.
3. The owner email in `src/config/site.ts` is authorized as `System Admin` for the controlled demo.
4. The owner identity is supplied through the server-only `VG_OWNER_EMAIL` environment value. It is deliberately separate from public contact configuration.
5. Additional demo users can be supplied through the server-only `VG_AUTHORIZED_EMAILS` environment value as a comma-separated list.
6. An authenticated account that is not allowed is redirected to `/app/login?reason=not-authorized` and sees the request-access path.

This is a bounded allowlist, not a complete invitation product. It has no invitation codes, expiration, usage limits, organization membership, revocation audit or RBAC database. Those capabilities require D1 or another approved persistent backend.

### Local development access

Sites dispatcher authentication is not available on a plain localhost server. A developer may set `VG_LOCAL_DEV_MODE=1`, `VG_LOCAL_DEV_USER_EMAIL` and an optional display name in an ignored `.env.local` file, then run `npm run dev:local`. The fallback identity is accepted only when `NODE_ENV=development`; it is a local inspection aid, not an app-owned login or a production authentication system.

The bootstrap username/password flow described for the future private workstation is intentionally not implemented here. It requires a separate local product boundary, an approved credential store, password hashing, rate limiting and durable access auditing; embedding the temporary credential or its bootstrap mechanism in this public repository would violate the repository boundary.

### Add or revoke a demo user

Manage `VG_OWNER_EMAIL` and `VG_AUTHORIZED_EMAILS` through Sites runtime configuration. Add a normalized email to authorize it; remove it to revoke future requests. Redeploy or refresh runtime configuration as required by the hosting control plane. Never place the authorization list in client code or couple it to the public contact address.

### Deployment boundary

The `/app` authentication path is Sites-only because `/signin-with-chatgpt`, `/signout-with-chatgpt` and `/callback` are owned by the Sites dispatcher. A Sites deployment must set `VG_TRUST_CHATGPT_AUTH_HEADERS=1` and an exact `VG_TRUSTED_SITES_HOSTS` production allowlist; its dispatcher and Worker must strip or overwrite all inbound `oai-authenticated-user-*` headers before adding verified identity. Mismatched forwarding headers, preview hosts and direct origins fail closed. The public Next.js build can still be validated for portability, but Vercel must not be presented as an equivalent authenticated deployment. Authorization explicitly denies the Vercel runtime until a compatible identity provider is designed.

## Current capability status

- **Demo:** Overview, Missions, Mission Builder, the aggregate Agent Library boundary, Model Library and Documentation.
- **Prototype:** Applications, Decision Lab, Knowledge Graph and Governance.
- **Preview:** Simulation, Scenarios, Research, Portfolio, Red Team review, Evidence Library and Audit.
- **Demo status:** System Health reports the repository's actual capability configuration and explicitly marks unavailable host telemetry.
- **Planned:** Settings, persistent invitations, organizations, RBAC, durable audit, collaboration and enterprise SSO.

All activity, missions, governance queues and audit events shown today are labeled synthetic fixtures. Disabled controls identify the backend requirement instead of pretending to persist or authorize an action.

## Future persistence model

A production authorization backend should add at minimum:

- User, Organization, Workspace and Membership;
- Invitation with hashed token, expiry, maximum uses and revocation;
- role and permission grants scoped to organization and workspace;
- Mission, Evidence, ModelRun, HumanGate and DecisionRecord;
- append-only audit events with actor, resource, reason, correlation ID and retention policy.

High-impact actions must be checked again on the server. Hiding a button is never authorization.

## Public IP boundary

Only Mathematics, Finance, Strategy and Marketing appear as public specialist agents. They are a deliberately reduced Lab sample, not a claim about the size of the broader capability registry, whose aggregate documentation records 1,970 profiles across 51 domains. Individual profiles, private prompts and execution code are not embedded here; the public Agent Library fails closed and displays only that boundary. New public agents may not be added without changing `AGENTS.md` and reviewing the public/private product boundary. New public models belong in `src/lab/model-catalog.ts` and must state purpose, interpretation, assumptions and limitations. Private prompts, weights, scoring, calibration, datasets and orchestration do not belong in this repository.

## Security notes

- User text is data and is never executed.
- Private routes are dynamic and excluded from indexing.
- The Worker adds anti-framing, MIME-sniffing, referrer and device-permission headers.
- The optional public web research is off by default, bounded, rate-limited and uses fixed provider endpoints. It is unverified context and does not change ranking.
- Durable multi-tenant isolation, invitation revocation and security audit retention are not implemented yet.
