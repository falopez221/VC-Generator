# Venture Governance Public Lab

The Public Lab is a limited, interactive demonstration of the Venture Governance concept. The private registry aggregates 1,970 profiles across 51 domains, but the Lab accepts a human thesis or problem, generates a reduced synthetic opportunity set, runs four public specialist perspectives, applies demonstrative quantitative models, and returns a ranking for human review.

The intake starts with a large free-text idea field. A transparent local assistant can summarize that narrative and suggest editable parameters before the four specialist agents run. This helper is not a fifth agent and does not call an external language model in public mode. The visible nine-stage pipeline is deliberately paced at roughly six seconds so visitors can follow it; the underlying deterministic calculations complete more quickly.

Optional public-web research is available as an explicit, off-by-default control. When enabled, bounded keywords derived from the reviewed market fields are sent server-side to a fixed Google News RSS endpoint. Returned snippets are stored in the run snapshot as unverified context; they do not increase evidence quality, confidence, score or ranking. Users are warned not to include confidential information.

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
