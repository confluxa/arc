import { ArcMessage, ResolveResult } from "./types";

export function resolveTaskMessages(messages: ArcMessage[]): ResolveResult {
  if (messages.length === 0) {
    return {
      status: "consensus",
      messages,
      resolution: "No messages found for this task."
    };
  }

  const uniqueContents = [...new Set(messages.map((msg) => msg.content.trim()))];

  if (uniqueContents.length <= 1) {
    return {
      status: "consensus",
      messages,
      resolution: uniqueContents[0] || "No actionable content found."
    };
  }

  const votes = uniqueContents
    .map((content) => ({
      content,
      count: messages.filter((msg) => msg.content.trim() === content).length
    }))
    .sort((a, b) => b.count - a.count || a.content.localeCompare(b.content));

  const top = votes[0];
  const alternatives = votes.slice(1).map((entry) => entry.content);
  const lowerContents = uniqueContents.map((item) => item.toLowerCase());
  const hasJwt = lowerContents.some((item) => item.includes("jwt"));
  const hasOauth = lowerContents.some((item) => item.includes("oauth"));
  const hasRest = lowerContents.some((item) => item.includes("rest"));
  const hasGraphql = lowerContents.some((item) => item.includes("graphql"));
  const hasSql = lowerContents.some((item) => item.includes("sql"));
  const hasNosql =
    lowerContents.some((item) => item.includes("nosql")) ||
    lowerContents.some((item) => item.includes("mongo")) ||
    lowerContents.some((item) => item.includes("document"));
  const mergedSuggestion =
    hasJwt && hasOauth
      ? "Use JWT for internal services and OAuth for external integrations"
      : hasRest && hasGraphql
        ? "Use REST for stable public endpoints and GraphQL for client-specific aggregation needs"
        : hasSql && hasNosql
          ? "Use SQL for transactional core data and NoSQL for high-velocity or flexible-schema workloads"
      : `Primary suggestion: "${top.content}". Alternatives: ${alternatives
          .map((item) => `"${item}"`)
          .join(", ")}.`;

  return {
    status: "conflict",
    messages,
    resolution: mergedSuggestion
  };
}
