import type { LabInput, Opportunity } from "./types.ts";

export interface LLMProvider {
  readonly name: string;
  generatePublicOpportunities(input: LabInput, signal?: AbortSignal): Promise<Opportunity[]>;
}

export class LiveAIUnavailableError extends Error {
  constructor() {
    super("Live AI mode is not enabled. The deterministic public demo remains available.");
    this.name = "LiveAIUnavailableError";
  }
}

// The public repository deliberately provides only the server-oriented contract.
// A future implementation must validate structured output and fall back to demo mode.
export async function runWithTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, Math.min(timeoutMs, 30000)));
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

