import { listMessagesByTask } from "../core/storage";
import { info } from "../utils/logger";

export async function runList(taskId: string): Promise<void> {
  if (!taskId?.trim()) {
    throw new Error("Task id is required. Usage: arc list <task>");
  }

  const messages = await listMessagesByTask(taskId.trim());
  if (messages.length === 0) {
    info(`No messages found for task "${taskId}".`);
    return;
  }

  info(`Messages for task "${taskId}":`);
  for (const msg of messages) {
    console.log(`- [${msg.timestamp}] (${msg.type}) ${msg.agent}: ${msg.content}`);
  }
}
