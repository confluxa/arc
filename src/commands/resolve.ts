import { resolveTaskMessages } from "../core/resolver";
import { listMessagesByTask } from "../core/storage";
import type { ArcMessage } from "../core/types";
import chalk from "chalk";

interface ResolveOptions {
  json?: boolean;
}

function compareMessagesByRecency(a: ArcMessage, b: ArcMessage): number {
  const tsCompare = a.timestamp.localeCompare(b.timestamp);
  if (tsCompare !== 0) return tsCompare;

  const contentCompare = a.content.localeCompare(b.content);
  if (contentCompare !== 0) return contentCompare;

  const agentCompare = a.agent.localeCompare(b.agent);
  if (agentCompare !== 0) return agentCompare;

  return a.id.localeCompare(b.id);
}

function toDisplayMessages(messages: ArcMessage[]): ArcMessage[] {
  // Step 1: deduplicate repeated agent/content pairs by keeping the latest copy.
  const latestByAgentAndContent = new Map<string, ArcMessage>();
  for (const msg of messages) {
    const key = `${msg.agent}\u0000${msg.content}`;
    const existing = latestByAgentAndContent.get(key);
    if (!existing || compareMessagesByRecency(existing, msg) < 0) {
      latestByAgentAndContent.set(key, msg);
    }
  }

  // Step 2: keep a single latest message per agent.
  const latestByAgent = new Map<string, ArcMessage>();
  for (const msg of latestByAgentAndContent.values()) {
    const existing = latestByAgent.get(msg.agent);
    if (!existing || compareMessagesByRecency(existing, msg) < 0) {
      latestByAgent.set(msg.agent, msg);
    }
  }

  return [...latestByAgent.values()].sort((a, b) => a.agent.localeCompare(b.agent));
}

function buildConflictResolutionDetails(messages: { content: string }[]): { bullets: string[]; why: string } {
  const lowerContents = messages.map((m) => m.content.toLowerCase());
  const hasJwt = lowerContents.some((item) => item.includes("jwt"));
  const hasOauth = lowerContents.some((item) => item.includes("oauth"));
  const hasRest = lowerContents.some((item) => item.includes("rest"));
  const hasGraphql = lowerContents.some((item) => item.includes("graphql"));
  const hasSql = lowerContents.some((item) => item.includes("sql"));
  const hasNosql =
    lowerContents.some((item) => item.includes("nosql")) ||
    lowerContents.some((item) => item.includes("mongo")) ||
    lowerContents.some((item) => item.includes("document"));

  if (hasJwt && hasOauth) {
    return {
      bullets: [
        "Use JWT for internal service-to-service authentication.",
        "Use OAuth for third-party integrations and delegated access."
      ],
      why: "This balances internal simplicity with secure external authorization standards."
    };
  }

  if (hasRest && hasGraphql) {
    return {
      bullets: [
        "Use REST for stable public and operational endpoints.",
        "Use GraphQL for client-specific aggregation and flexible querying."
      ],
      why: "This keeps core APIs predictable while giving product clients flexibility."
    };
  }

  if (hasSql && hasNosql) {
    return {
      bullets: [
        "Use SQL for transactional, relational core workloads.",
        "Use NoSQL for high-scale or flexible-schema data domains."
      ],
      why: "This preserves data integrity where needed and scalability where it matters."
    };
  }

  return {
    bullets: [
      `Use the primary suggestion with highest agreement: "${messages[0]?.content ?? "N/A"}".`,
      "Track alternatives as fallback options for edge-case requirements."
    ],
    why: "This maximizes alignment now while preserving flexibility as requirements evolve."
  };
}

export async function runResolve(taskId: string, options: ResolveOptions): Promise<void> {
  if (!taskId?.trim()) {
    throw new Error("Task id is required. Usage: arc resolve <task>");
  }

  const messages = await listMessagesByTask(taskId.trim());
  if (messages.length === 0) {
    throw new Error(`No messages found for task "${taskId}".`);
  }

  const result = resolveTaskMessages(messages);
  const displayMessages = toDisplayMessages(result.messages);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const statusLabel =
    result.status === "conflict" ? chalk.red("CONFLICT DETECTED") : chalk.green("CONSENSUS");

  console.log("");
  console.log(chalk.bold.blue("=== ARC Resolution ==="));
  console.log(`Task: ${taskId}`);
  console.log("");
  console.log(`Status: ${statusLabel}`);
  if (result.status === "conflict") {
    console.log("");
    console.log(chalk.bold("Reason:"));
    console.log("Multiple agents provided different approaches for the same task.");
  }
  console.log("");
  console.log(chalk.bold("Agents involved:"));
  console.log("");

  for (const message of displayMessages) {
    console.log(`* ${chalk.cyan(message.agent)} -> "${message.content}"`);
  }
  console.log("");

  console.log(chalk.bold("Recommended Approach:"));
  if (result.status === "conflict") {
    const details = buildConflictResolutionDetails(result.messages);
    console.log("Multiple AI agents produced conflicting suggestions.");
    console.log("ARC resolves them into a single approach.");
    console.log("");
    console.log("Adopt a hybrid approach:");
    for (const bullet of details.bullets) {
      console.log(`* ${bullet}`);
    }
    console.log("");
    console.log(details.why);
  } else {
    console.log(result.resolution);
  }
}
