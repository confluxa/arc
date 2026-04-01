import chalk from "chalk";
import { normalizeRole } from "../core/roles";
import { listMessagesByTask } from "../core/storage";
import { formatTimestamp } from "../utils/time";

export async function runView(taskId: string): Promise<void> {
  if (!taskId?.trim()) {
    throw new Error("Task id is required. Usage: arc view <task>");
  }

  const messages = await listMessagesByTask(taskId.trim());
  if (messages.length === 0) {
    throw new Error(`No messages found for task "${taskId}".`);
  }

  const grouped = new Map<string, typeof messages>();
  for (const msg of messages) {
    const existing = grouped.get(msg.agent) ?? [];
    existing.push(msg);
    grouped.set(msg.agent, existing);
  }

  console.log(chalk.bold.blue("=== ARC Task View ==="));
  console.log(`Task: ${taskId}`);
  console.log("");

  for (const [agent, agentMessages] of grouped.entries()) {
    console.log(chalk.bold(`${chalk.cyan(agent)}`));
    for (const msg of agentMessages) {
      console.log(
        `- ${chalk.gray(formatTimestamp(msg.timestamp))} [${msg.type}] [${normalizeRole(msg.role)}] ${msg.content}`
      );
    }
    console.log("");
  }
}
