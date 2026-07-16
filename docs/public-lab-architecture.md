# Public Lab architecture

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

The engine is pure and deterministic. UI state, saved opportunities, comparison selections, evidence changes, audio preferences, and human decisions remain in browser storage. No production database or external API is required.

The UI and engine are separated so a future server-only `LLMProvider` can return validated public structures without changing the deterministic fallback.

