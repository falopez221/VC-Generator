# Venture Governance Public Lab

The Public Lab is a limited, interactive demonstration of the Venture Governance concept. It accepts a human thesis or problem, generates a reduced synthetic opportunity set, runs four public specialist perspectives, applies demonstrative quantitative models, and returns a ranking for human review.

It is intentionally not the complete product, the private local architecture, an autonomous investment system, or a startup execution platform.

## Routes

- `/lab`: scope, public flow, and entry point.
- `/lab/demo`: deterministic interactive simulation.
- `/lab/results/[id]`: persisted local run and human-review state.
- `/lab/methodology`: public agents, models, data labels, and limitations.

## Demo mode

Demo mode requires no API key. Identical sanitized inputs, parameters, and seed produce identical opportunities and metrics. Runs are stored in browser storage and can be exported as JSON or CSV.

## Future Live AI mode

The repository exposes an `LLMProvider` contract only. A future provider must execute server-side, use minimal public prompts, enforce timeouts and structured validation, and fall back to deterministic demo mode. No private prompts or orchestration are included here.

