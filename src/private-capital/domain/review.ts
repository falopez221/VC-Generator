import type { HumanReviewAction, HumanReviewRecord, HumanReviewState, ValidationResult } from "./types.ts";
import { isIsoTimestamp, sanitizeText } from "./validation.ts";

const TRANSITIONS: Record<HumanReviewState, Partial<Record<HumanReviewAction, HumanReviewState>>> = {
  draft: { submit: "pending_review", archive: "archived" },
  pending_review: {
    accept_for_tracking: "approved_hypothesis",
    investigate: "needs_research",
    discard: "rejected",
    reformulate: "draft",
    expire: "expired",
    archive: "archived",
  },
  approved_hypothesis: { investigate: "needs_research", reformulate: "draft", expire: "expired", archive: "archived" },
  rejected: { reformulate: "draft", archive: "archived" },
  needs_research: { submit: "pending_review", reformulate: "draft", discard: "rejected", expire: "expired", archive: "archived" },
  expired: { reformulate: "draft", archive: "archived" },
  archived: {},
};

export function createHumanReview(id: string, signalId: string, timestamp: string): ValidationResult<HumanReviewRecord> {
  const issues: string[] = [];
  if (!sanitizeText(id, 80) || !sanitizeText(signalId, 80)) issues.push("Review and signal ids are required.");
  if (!isIsoTimestamp(timestamp)) issues.push("Review timestamp must be ISO-8601 UTC.");
  return {
    value: issues.length === 0 ? {
      id: sanitizeText(id, 80),
      signalId: sanitizeText(signalId, 80),
      state: "draft",
      updatedAt: timestamp,
      history: [],
      executionAuthorized: false,
    } : null,
    issues,
  };
}

export function transitionHumanReview(args: {
  review: HumanReviewRecord;
  action: HumanReviewAction;
  actorId: string;
  timestamp: string;
  note: string;
}): ValidationResult<HumanReviewRecord> {
  const issues: string[] = [];
  const target = TRANSITIONS[args.review.state][args.action];
  if (!target) issues.push(`Action ${args.action} is not allowed from ${args.review.state}.`);
  if (!sanitizeText(args.actorId, 80)) issues.push("A human actor id is required.");
  if (!isIsoTimestamp(args.timestamp) || Date.parse(args.timestamp) < Date.parse(args.review.updatedAt)) {
    issues.push("Transition timestamp must be valid and monotonic.");
  }
  if (issues.length > 0 || !target) return { value: null, issues };
  return {
    value: {
      ...args.review,
      state: target,
      updatedAt: args.timestamp,
      history: [...args.review.history, {
        from: args.review.state,
        to: target,
        action: args.action,
        actorId: sanitizeText(args.actorId, 80),
        timestamp: args.timestamp,
        note: sanitizeText(args.note, 1_000),
      }],
      executionAuthorized: false,
    },
    issues,
  };
}

export function allowedHumanReviewActions(state: HumanReviewState): HumanReviewAction[] {
  return Object.keys(TRANSITIONS[state]) as HumanReviewAction[];
}
