export type MessageType = "proposal" | "result" | "note";

/** Optional agent stance in a multi-agent reasoning chain. */
export type AgentRole = "proposer" | "critic" | "validator";

export type ConfidenceLevel = "low" | "medium" | "high";

/** Inferred topic from proposal keywords (extensible). */
export type DecisionDomain = "auth" | "api" | "database" | "unknown";

/** How agent proposals relate when content differs. */
export type RelationshipKind = "consensus" | "conflict" | "complementary";

/** How ARC resolves the set of proposals. */
export type ResolutionStrategyKind = "hybrid" | "context_split" | "choose_one" | "defer";

export interface ArcMessage {
  id: string;
  task_id: string;
  agent: string;
  type: MessageType;
  content: string;
  timestamp: string;
  /** Defaults to proposer when omitted (older messages). */
  role?: AgentRole;
}

export interface ResolveResult {
  status: "conflict" | "consensus";
  messages: ArcMessage[];
  domain: DecisionDomain;
  relationship: RelationshipKind;
  strategy: ResolutionStrategyKind;
  decision: string;
  confidence: ConfidenceLevel;
  reasoning: string[];
  tradeoffs: string[];
  alternatives: {
    content: string;
    agents: string[];
  }[];
  // Backward-compatible alias for older callers.
  resolution: string;
}
