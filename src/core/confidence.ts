import type { ArcMessage, ConfidenceLevel } from "./types";

/**
 * Inputs for confidence scoring. Extend this type as new signals are added
 * (e.g. agent reputation, message age, task type).
 */
export interface ConfidenceContext {
  messageCount: number;
  /** Distinct agent names across all messages. */
  distinctAgentCount: number;
  /** Distinct trimmed proposal contents. */
  uniqueContentCount: number;
}

/**
 * Derives scoring context from raw task messages.
 */
export function buildConfidenceContext(messages: ArcMessage[]): ConfidenceContext {
  const trimmedContents = messages.map((m) => m.content.trim());
  const agents = new Set(messages.map((m) => m.agent));
  const contents = new Set(trimmedContents);
  return {
    messageCount: messages.length,
    distinctAgentCount: agents.size,
    uniqueContentCount: contents.size
  };
}

export type ConfidenceScorer = (ctx: ConfidenceContext) => ConfidenceLevel;

/**
 * Default rules:
 * - Single message → low (insufficient corroboration)
 * - All agents agree (one unique content, multiple messages) → high
 * - Two agents disagree → medium
 * - Three or more agents with conflicting content → low
 */
export const defaultScoreConfidence: ConfidenceScorer = (ctx) => {
  if (ctx.messageCount === 0) return "low";
  if (ctx.messageCount === 1) return "low";
  if (ctx.uniqueContentCount <= 1) return "high";
  if (ctx.distinctAgentCount === 2) return "medium";
  return "low";
};

/**
 * Computes confidence from context. Pass a custom `scorer` to experiment with
 * new policies without changing resolver structure.
 */
export function scoreConfidence(
  ctx: ConfidenceContext,
  scorer: ConfidenceScorer = defaultScoreConfidence
): ConfidenceLevel {
  return scorer(ctx);
}
