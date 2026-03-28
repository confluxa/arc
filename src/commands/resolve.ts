import { resolveTaskMessages } from "../core/resolver";
import { listMessagesByTask } from "../core/storage";
import chalk from "chalk";

interface ResolveOptions {
  json?: boolean;
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

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const statusLabel = result.status === "conflict" ? chalk.red("CONFLICT") : chalk.green("CONSENSUS");

  console.log(chalk.bold.blue("=== ARC Resolution ==="));
  console.log(`Task: ${taskId}`);
  console.log("");
  console.log(`Status: ${statusLabel}`);
  console.log("");
  console.log(chalk.bold("Agents involved:"));
  console.log("");

  for (const message of result.messages) {
    console.log(`* ${chalk.cyan(message.agent)} -> "${message.content}"`);
  }
  console.log("");

  console.log(chalk.bold("Suggested Resolution:"));
  console.log(result.resolution);
}
