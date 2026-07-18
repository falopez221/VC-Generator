/**
 * Private evidence contracts. These records are deliberately separate from the
 * public Lab snapshot: they are scoped to an authenticated workspace request
 * and retain enough provenance for later human review.
 */
export const PRIVATE_RESEARCH_PROVIDERS = ["google-news"] as const;
export type PrivateResearchProvider = (typeof PRIVATE_RESEARCH_PROVIDERS)[number];

export type PrivateResearchStatus = "Completed" | "Partial" | "Unavailable";

export interface PrivateResearchRequest {
  topic: string;
  context: string;
  provider: PrivateResearchProvider;
  maxSources: number;
}

export interface PrivateResearchSource {
  id: string;
  provider: PrivateResearchProvider;
  query: string;
  title: string;
  url: string;
  publisher: string;
  snippet: string;
  publishedAt: string | null;
  retrievedAt: string;
}

export interface PrivateResearchSnapshot {
  status: PrivateResearchStatus;
  query: string;
  provider: PrivateResearchProvider;
  retrievedAt: string;
  sources: PrivateResearchSource[];
  warnings: string[];
  limitations: string[];
}
