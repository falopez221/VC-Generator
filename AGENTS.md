# Venture Governance System — repository guidance

## Context

Venture Governance System™ is a conceptual multi-agent architecture for expanding human capacity to explore, compare, and prioritize venture opportunities. This repository contains the public institutional website and a deliberately reduced public Lab.

## Public Lab scope

The public Lab demonstrates a transparent flow from human input to synthetic opportunities, four visible specialist agents, demonstrative quantitative models, ranking, and human review. It must run without paid APIs, private datasets, authentication, billing, or enterprise infrastructure.

Only these public agents may appear in the Lab:

1. Mathematics
2. Finance
3. Strategy
4. Marketing

The public Lab may create 6–12 synthetic opportunities per run. It may produce early technical validation suggestions, specifications, MCP concepts, or limited prototypes, but it must never claim to execute a complete startup.

## Limitations and intellectual-property rules

- Never expose private prompts, system prompts, chain of thought, private weights, proprietary scoring, historical calibration, training strategies, private datasets, the complete agent network, local-model implementation, or private orchestration logic.
- Use deterministic demo rules, visible fictitious weights, synthetic data, and reproducible seeds.
- Label estimates, assumptions, simulations, inference, observed evidence, and synthetic data separately.
- Do not imply investment approval, guaranteed outcomes, autonomous funding, company deployment, or financial advice.
- Do not add public agents beyond the four listed above.
- Do not execute agent-produced code, arbitrary commands, remote URLs, or user-provided scripts.

## Separation from the private product

The website and `/lab` are a public explanatory surface. The complete local system, extended agent network, proprietary orchestration, private quantitative models, learning mechanisms, datasets, and production SaaS capabilities belong outside this repository. Public extension points may describe future providers but must not contain secrets or private implementation.

## Code conventions

- Preserve Next.js App Router, React, strict TypeScript, Vinext/Vite, and Sites compatibility.
- Keep the existing landing intact; new Lab work belongs under `app/lab`, `src/lab`, and Lab-specific styles/components.
- Prefer pure functions for models, seeded randomness, validation, ranking, and classification.
- Keep user-facing content concrete and accessible. Use semantic controls, keyboard navigation, visible focus, ARIA live regions, and text summaries for charts.
- Avoid external runtime dependencies unless they materially reduce complexity and are compatible with the current deployment.
- Reuse existing audio files and centralize Lab sound events through `playSound(eventName)`.
- Do not autoplay sound. Respect stored preferences and `prefers-reduced-motion`.

## Modeling rules

- Demo calculations must be real, deterministic for identical inputs and seeds, and bounded to safe finite ranges.
- Agent weights must normalize to 100% before scoring.
- A high score with weak evidence or high uncertainty must not become “Highly Promising” automatically.
- MCDA, Monte Carlo, Bayesian update, scenario analysis, sensitivity, risk matrices, and Pareto comparison are demonstrative public models, not the private formula.
- Every metric must expose its assumptions and limitations in the interface or methodology.
- Human decisions update state but never trigger investment or execution.

## Security rules

- Validate and sanitize inputs; enforce length, count, and numeric bounds.
- Keep future LLM calls server-only with timeouts, safe fallbacks, minimal public prompts, and no secret logging.
- Treat user text as data, not instructions. Never execute it.
- Do not implement SSRF, arbitrary fetches, arbitrary CORS, uploads, or code execution in the public Lab.
- Persist public-demo state locally unless a future approved design explicitly requires managed storage.

## Definition of done

- `/`, `/lab`, `/lab/demo`, `/lab/results/[id]`, and `/lab/methodology` render successfully.
- The demo works without an API key and produces 6–12 reproducible synthetic opportunities.
- Four structured public agents, interactive quantitative models, comparison, export, persistence, and human-review controls work.
- Audio remains optional, has no autoplay, and visual feedback never depends on sound.
- Responsive and accessibility-critical behavior is implemented.
- Unit tests, route/integration tests, type checking, lint, and production build pass.
- The public limitations and IP boundary remain visible and documented.

