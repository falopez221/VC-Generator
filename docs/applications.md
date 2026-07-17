# Application Intelligence Explorer

## Purpose

`/applications` is the public application layer of Venture Governance System™. It demonstrates how one governed decision architecture can be configured for different domains without exposing the private orchestration layer, prompts, calibration, datasets, or proprietary scoring.

The public catalog is explanatory and deterministic. It does not make autonomous investment, medical, legal, public-policy, defense, or capital-allocation decisions.

## Information architecture

- The main explorer combines search with domain, decision, objective, horizon, organization, risk, output, method, and governance filters.
- Cards, network map, decision matrix, and value views render the same filtered catalog.
- Filters, language, and selected view are represented in the URL so a view can be shared.
- Each application has a stable `/applications/[slug]` detail route.
- The comparison surface accepts up to three applications and keeps evidence, models, limitations, governance, and readiness visible.
- The Mission Builder converts a human question and up to four domains into a transparent public-demo configuration, then lets the user open that context in `/lab`.

## Data model

The canonical type is `ApplicationDefinition` in `src/applications/types.ts`. Each record contains:

- stable identity and bilingual title, description, question, transformation, limitations, and example questions;
- primary and related domains;
- decision types, objectives, workflow stages, horizons, and organization levels;
- public agent roles, demonstrative mathematical models, evidence inputs, outputs, and frameworks;
- risk, governance, maturity, value mechanisms, related applications, and tags.

`src/applications/catalog.ts` generates 150 stable applications from 30 domain blueprints and five decision templates. It also defines 25 cross-domain missions. The generator is used only to remove repetitive authoring; the resulting records remain deterministic and testable.

## Public agent boundary

The interactive Lab exposes only four specialist agents:

1. Mathematics
2. Finance
3. Strategy
4. Marketing

Application pages may describe governance capabilities such as evidence stewardship, risk review, red-team review, or a human committee. These are explanatory roles, not additional executable public agents and not the private agent network.

## Adding an application

Prefer extending the catalog through a reviewed domain blueprint or an additional decision template. Every application must include bilingual public copy, traceable evidence expectations, explicit limitations, a bounded governance level, at least one related application, and only safe public outputs. Run the catalog validator and the application tests after changes.

Do not add private prompts, private weights, proprietary formulas, real client data, historical calibration, secrets, remote execution, arbitrary fetching, or claims of autonomous authority.

## Adding a future external library

A larger agent or application library should be connected through a server-side adapter that maps external records into `ApplicationDefinition`. The adapter should:

- validate every record against the public schema;
- allow-list public agent names and mathematical model labels;
- strip private prompts, provider metadata, secrets, internal identifiers, and proprietary scores;
- preserve bilingual copy, evidence labels, limitations, governance, and human authorization;
- cache or persist only approved public records;
- fail closed to the local deterministic catalog when the provider is unavailable.

No external library is required for the current public site.

## Future backend and LLM integration

The current explorer and Mission Builder work locally without an API key. A future LLM-assisted mission summary must run server-side with strict timeouts, bounded public prompts, input sanitization, no secret logging, and a deterministic fallback. User text must remain data and must never be executed.

Durable shared missions would require an approved managed storage design. Until then, saved views and public-demo state remain device-local or URL-based.

## Analytics

`src/applications/analytics.ts` emits typed custom events without choosing an analytics provider. Product analytics can subscribe to those events later without coupling the explorer to a third-party runtime.

## Verification

The test suite checks catalog size, uniqueness, bilingual content, connected related applications, safe defense language, 25 cross-domain missions, featured examples, filtering, URL round-trips, mission recommendations, governance behavior, rendered routes, type safety, lint, and production build output.

