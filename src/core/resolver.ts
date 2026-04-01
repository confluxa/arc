import { buildConfidenceContext, scoreConfidence, type ConfidenceScorer } from "./confidence";
import { analyzeAndResolve } from "./heuristics";
import { ArcMessage, ResolveResult } from "./types";

export interface ResolveTaskOptions {
  /** Override default confidence policy (e.g. for tests or future weighted scoring). */
  scoreConfidence?: ConfidenceScorer;
}

export function resolveTaskMessages(
  messages: ArcMessage[],
  options?: ResolveTaskOptions
): ResolveResult {
  const confidence = scoreConfidence(buildConfidenceContext(messages), options?.scoreConfidence);

  if (messages.length === 0) {
    return {
      status: "consensus",
      domain: "unknown",
      relationship: "consensus",
      strategy: "defer",
      messages,
      decision: "No messages found for this task.",
      confidence,
      reasoning: ["No agent proposals were available to evaluate."],
      tradeoffs: [],
      alternatives: [],
      resolution: "No messages found for this task."
    };
  }

  const groupedByContent = new Map<string, Set<string>>();
  for (const msg of messages) {
    const content = msg.content.trim();
    const agents = groupedByContent.get(content) ?? new Set<string>();
    agents.add(msg.agent);
    groupedByContent.set(content, agents);
  }
  const uniqueContents = [...groupedByContent.keys()];
  const alternatives = uniqueContents.map((content) => ({
    content,
    agents: [...(groupedByContent.get(content) ?? new Set<string>())].sort()
  }));

  const rankedAlternatives = [...alternatives].sort(
    (a, b) => b.agents.length - a.agents.length || a.content.localeCompare(b.content)
  );

  const analysis = analyzeAndResolve(messages, uniqueContents, alternatives);

  const status: ResolveResult["status"] = uniqueContents.length <= 1 ? "consensus" : "conflict";

  return {
    status,
    messages,
    domain: analysis.domain,
    relationship: analysis.relationship,
    strategy: analysis.strategy,
    decision: analysis.decision,
    confidence,
    reasoning: analysis.reasoning,
    tradeoffs: analysis.tradeoffs,
    alternatives: rankedAlternatives,
    resolution: analysis.decision
  };
}
