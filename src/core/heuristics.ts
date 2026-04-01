import { buildRoleReasoningLines, roleWeight } from "./roles";
import type { ArcMessage, DecisionDomain, RelationshipKind, ResolutionStrategyKind } from "./types";

export interface GroupedAlternatives {
  content: string;
  agents: string[];
}

export interface HeuristicAnalysis {
  domain: DecisionDomain;
  relationship: RelationshipKind;
  strategy: ResolutionStrategyKind;
  decision: string;
  reasoning: string[];
  tradeoffs: string[];
}

const DOMAIN_LABEL: Record<Exclude<DecisionDomain, "unknown">, string> = {
  auth: "authentication",
  api: "API design",
  database: "data storage"
};

function normalizeForScan(s: string): string {
  return s.toLowerCase();
}

function lineHasRelationalSql(line: string): boolean {
  const lc = normalizeForScan(line);
  return /\bsql\b/i.test(lc) && !/\bnosql\b/i.test(lc);
}

/** Scan all unique proposal texts for keyword hits. */
export function detectDomain(uniqueContents: string[]): DecisionDomain {
  const blob = normalizeForScan(uniqueContents.join("\n"));
  const hasJwt = /\bjwt\b/i.test(blob);
  const hasOauth = /\boauth\b/i.test(blob);
  const hasRest = /\brest\b/i.test(blob);
  const hasGraphql = /\bgraphql\b/i.test(blob);
  const hasNoSql =
    /\bnosql\b/i.test(blob) || /\bmongo(db)?\b/i.test(blob) || /\bdocument\b/i.test(blob);
  const hasSql = uniqueContents.some((c) => lineHasRelationalSql(c));

  const authHit = hasJwt || hasOauth;
  const apiHit = hasRest || hasGraphql;
  const dbHit = hasSql || hasNoSql;

  const score = { auth: 0, api: 0, database: 0 };
  if (authHit) score.auth += 2;
  if (hasJwt) score.auth += 1;
  if (hasOauth) score.auth += 1;
  if (apiHit) score.api += 2;
  if (hasRest) score.api += 1;
  if (hasGraphql) score.api += 1;
  if (dbHit) score.database += 2;
  if (hasSql) score.database += 1;
  if (hasNoSql) score.database += 1;

  const max = Math.max(score.auth, score.api, score.database);
  if (max === 0) return "unknown";
  if (score.auth === max) return "auth";
  if (score.api === max) return "api";
  return "database";
}

export function scanKeywordFlags(uniqueContents: string[]): {
  hasJwt: boolean;
  hasOauth: boolean;
  hasRest: boolean;
  hasGraphql: boolean;
  hasSql: boolean;
  hasNoSql: boolean;
} {
  const blob = normalizeForScan(uniqueContents.join("\n"));
  const hasNoSql =
    /\bnosql\b/i.test(blob) || /\bmongo(db)?\b/i.test(blob) || /\bdocument\b/i.test(blob);
  const hasSql = uniqueContents.some((c) => lineHasRelationalSql(c));
  return {
    hasJwt: /\bjwt\b/i.test(blob),
    hasOauth: /\boauth\b/i.test(blob),
    hasRest: /\brest\b/i.test(blob),
    hasGraphql: /\bgraphql\b/i.test(blob),
    hasSql,
    hasNoSql
  };
}

export function classifyRelationship(
  uniqueContentCount: number,
  domain: DecisionDomain,
  flags: ReturnType<typeof scanKeywordFlags>
): RelationshipKind {
  if (uniqueContentCount <= 1) return "consensus";

  if (domain === "auth" && flags.hasJwt && flags.hasOauth) return "complementary";
  if (domain === "api" && flags.hasRest && flags.hasGraphql) return "complementary";
  if (domain === "database" && flags.hasSql && flags.hasNoSql) return "complementary";

  return "conflict";
}

export function selectStrategy(
  relationship: RelationshipKind,
  domain: DecisionDomain,
  flags: ReturnType<typeof scanKeywordFlags>
): ResolutionStrategyKind {
  if (relationship === "consensus") return "choose_one";

  if (relationship === "complementary") {
    if (domain === "auth" && flags.hasJwt && flags.hasOauth) return "context_split";
    if (domain === "api" && flags.hasRest && flags.hasGraphql) return "hybrid";
    if (domain === "database" && flags.hasSql && flags.hasNoSql) return "hybrid";
  }

  if (relationship === "conflict") return "choose_one";

  return "choose_one";
}

function domainLine(domain: DecisionDomain): string | null {
  if (domain === "unknown") return null;
  return `Domain: ${DOMAIN_LABEL[domain]} (keywords matched across proposals).`;
}

function buildComplementaryDecision(
  domain: DecisionDomain,
  strategy: ResolutionStrategyKind
): { decision: string; reasoning: string[]; tradeoffs: string[] } {
  if (domain === "auth" && strategy === "context_split") {
    return {
      decision: "Use JWT for internal services and OAuth for external integrations",
      reasoning: [
        domainLine("auth")!,
        "Relationship: complementary — JWT and OAuth address different trust boundaries.",
        "Strategy: context_split — separate internal service auth from external delegated access."
      ],
      tradeoffs: ["JWT: simple but limited", "OAuth: flexible but complex"]
    };
  }
  if (domain === "api" && strategy === "hybrid") {
    return {
      decision:
        "Use REST for stable public endpoints and GraphQL for client-specific aggregation needs",
      reasoning: [
        domainLine("api")!,
        "Relationship: complementary — REST and GraphQL suit different client needs.",
        "Strategy: hybrid — combine predictable HTTP resources with flexible query shapes."
      ],
      tradeoffs: [
        "REST: simple caching and versioning; may duplicate aggregation logic",
        "GraphQL: flexible for clients; more operational complexity"
      ]
    };
  }
  if (domain === "database" && strategy === "hybrid") {
    return {
      decision:
        "Use SQL for transactional core data and NoSQL for high-velocity or flexible-schema workloads",
      reasoning: [
        domainLine("database")!,
        "Relationship: complementary — relational and document models fit different workloads.",
        "Strategy: hybrid — use each store where its strengths apply."
      ],
      tradeoffs: [
        "SQL: strong consistency and joins; vertical scaling limits",
        "NoSQL: scale and schema flexibility; weaker cross-document guarantees"
      ]
    };
  }
  return {
    decision: "No actionable decision generated.",
    reasoning: ["Could not derive a structured merge for this domain and strategy."],
    tradeoffs: []
  };
}

function sumRoleWeightForContent(messages: ArcMessage[], content: string): number {
  const trimmed = content.trim();
  let sum = 0;
  for (const m of messages) {
    if (m.content.trim() === trimmed) sum += roleWeight(m.role);
  }
  return sum;
}

/** Rank by role-weighted score, then agent count, then lexicographic. */
function rankAlternatives(
  alternatives: GroupedAlternatives[],
  messages: ArcMessage[]
): GroupedAlternatives[] {
  return [...alternatives].sort((a, b) => {
    const wa = sumRoleWeightForContent(messages, a.content);
    const wb = sumRoleWeightForContent(messages, b.content);
    if (wb !== wa) return wb - wa;
    if (b.agents.length !== a.agents.length) return b.agents.length - a.agents.length;
    return a.content.localeCompare(b.content);
  });
}

function mergeReasoning(roleLines: string[], body: string[]): string[] {
  if (roleLines.length === 0) return body;
  return [...roleLines, "", ...body];
}

/**
 * Pipeline: domain → relationship → strategy → decision payload.
 */
export function analyzeAndResolve(
  messages: ArcMessage[],
  uniqueContents: string[],
  alternatives: GroupedAlternatives[]
): HeuristicAnalysis {
  const roleLines = buildRoleReasoningLines(messages);
  const ranked = rankAlternatives(alternatives, messages);
  const flags = scanKeywordFlags(uniqueContents);
  const domain = detectDomain(uniqueContents);
  const relationship = classifyRelationship(uniqueContents.length, domain, flags);
  let strategy = selectStrategy(relationship, domain, flags);

  if (uniqueContents.length <= 1) {
    const decision = uniqueContents[0] || "No actionable content found.";
    const lines: string[] = [];
    const dl = domainLine(domain);
    if (dl) lines.push(dl);
    lines.push("Relationship: consensus — all proposals align on the same approach.");
    lines.push("Strategy: choose_one — adopt the unanimous recommendation.");
    return {
      domain,
      relationship: "consensus",
      strategy: "choose_one",
      decision,
      reasoning: mergeReasoning(roleLines, lines),
      tradeoffs: []
    };
  }

  if (relationship === "complementary") {
    const built = buildComplementaryDecision(domain, strategy);
    if (built.decision !== "No actionable decision generated.") {
      return {
        domain,
        relationship,
        strategy,
        decision: built.decision,
        reasoning: mergeReasoning(roleLines, built.reasoning),
        tradeoffs: built.tradeoffs
      };
    }
    strategy = "choose_one";
  }

  const primary = ranked[0];
  const decision = primary?.content || "No actionable decision generated.";
  const lines: string[] = [];
  const dl = domainLine(domain);
  if (dl) lines.push(dl);
  lines.push(
    "Relationship: conflict — proposals reflect competing approaches without a clear coexistence pattern."
  );
  lines.push(
    "Strategy: choose_one — select the option with the highest role-weighted support (validator > critic > proposer)."
  );
  lines.push("Next: validate against constraints or gather more context if confidence is low.");
  return {
    domain,
    relationship: "conflict",
    strategy,
    decision,
    reasoning: mergeReasoning(roleLines, lines),
    tradeoffs: ["Chosen option may not cover all edge cases raised by alternatives."]
  };
}
