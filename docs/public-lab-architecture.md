# Public Lab architecture

This is the deliberately reduced public execution path. The private registry aggregates 1,970 profiles across 51 domains and mission-based selection separates that registry from any individual run. The public Lab exposes only four representative specialists; individual profiles, prompts and selection logic are not part of the public repository.

```text
Human intake
  -> input validation and normalization
  -> seeded synthetic opportunity generation
  -> Mathematics / Finance / Strategy / Marketing analyses
  -> cross-agent critique
  -> public quantitative models
  -> demonstrative ranking and classification
  -> local persistence and human review
```

The scoring and generation engine is pure and deterministic. UI state, saved opportunities, comparison selections, evidence notes, audio preferences, and human decisions remain in browser storage. No production database or external API is required for the default mode. An optional server route can capture a dated public-news snapshot; it is off by default, uses fixed providers and never changes the deterministic ranking.

The UI and engine are separated so a future server-only `LLMProvider` can return validated public structures without changing the deterministic fallback.
