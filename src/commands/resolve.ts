import { normalizeRole } from "../core/roles";
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
    result.status === "conflict" ? chalk.red("conflict") : chalk.green("consensus");
  const confidenceLabel =
    result.confidence === "high"
      ? chalk.green(result.confidence)
      : result.confidence === "medium"
        ? chalk.yellow(result.confidence)
        : chalk.red(result.confidence);

  console.log("");
  console.log(chalk.bold.blue("=== ARC Decision ==="));
  console.log(`Task: ${taskId}`);
  console.log("");
  console.log(`Domain: ${chalk.magenta(result.domain)}`);
  console.log(`Relationship: ${chalk.magenta(result.relationship)}`);
  console.log(`Strategy: ${chalk.magenta(result.strategy)}`);
  console.log("");
  console.log(`Status: ${statusLabel}`);
  console.log("");
  console.log(`Decision: ${chalk.bold(result.decision)}`);
  console.log("");
  console.log(`Confidence: ${confidenceLabel}`);

  console.log("");
  console.log(chalk.bold("Reasoning:"));
  if (result.reasoning.length === 0) {
    console.log("* (none)");
  } else {
    for (const item of result.reasoning) {
      console.log(`* ${item}`);
    }
  }

  console.log("");
  console.log(chalk.bold("Trade-offs:"));
  if (result.tradeoffs.length === 0) {
    console.log("* (none)");
  } else {
    for (const item of result.tradeoffs) {
      console.log(`* ${item}`);
    }
  }

  if (result.alternatives.length > 0) {
    console.log("");
    console.log(chalk.bold("Alternatives:"));
    for (const option of result.alternatives) {
      console.log(`* "${option.content}" <- ${option.agents.join(", ")}`);
    }
  }

  if (displayMessages.length > 0) {
    console.log("");
    console.log(chalk.bold("Agents involved:"));
    for (const message of displayMessages) {
      console.log(
        `* ${chalk.cyan(message.agent)} [${normalizeRole(message.role)}] -> "${message.content}"`
      );
    }
  }
}
