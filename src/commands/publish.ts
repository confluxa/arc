import { saveMessage } from "../core/storage";
import type { AgentRole, MessageType } from "../core/types";
import { normalizeRole } from "../core/roles";
import { createId } from "../utils/ids";
import { info, success } from "../utils/logger";

interface PublishOptions {
  task: string;
  type: MessageType;
  content: string;
  agent: string;
  role: AgentRole;
}

export async function runPublish(options: PublishOptions): Promise<void> {
  if (!options.task?.trim()) {
    throw new Error("Missing --task value.");
  }
  if (!options.content?.trim()) {
    throw new Error("Missing --content value.");
  }
  if (!options.agent?.trim()) {
    throw new Error("Missing --agent value.");
  }

  const role = normalizeRole(options.role);

  const message = {
    id: createId(),
    task_id: options.task.trim(),
    agent: options.agent.trim(),
    type: options.type,
    content: options.content.trim(),
    timestamp: new Date().toISOString(),
    role
  };

  await saveMessage(message);
  success(`Published ${message.type} message for task "${message.task_id}"`);
  info(`  Agent: ${message.agent}`);
  info(`  Role: ${role}`);
  info("  Saved to workspace");
  console.log("");
}
