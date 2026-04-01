import { promises as fs } from "node:fs";
import path from "node:path";
import { isAgentRole } from "./roles";
import { ArcMessage } from "./types";

const ROOT_DIR = ".confluxa";
const CONTEXT_FILE = "context.json";
const MESSAGES_DIR = "messages";
const TASKS_DIR = "tasks";

function isArcMessage(value: unknown): value is ArcMessage {
  if (!value || typeof value !== "object") return false;
  const msg = value as Record<string, unknown>;
  const type = msg.type;

  const roleOk = msg.role === undefined || msg.role === null || isAgentRole(msg.role);

  return (
    typeof msg.id === "string" &&
    typeof msg.task_id === "string" &&
    typeof msg.agent === "string" &&
    typeof msg.content === "string" &&
    typeof msg.timestamp === "string" &&
    (type === "proposal" || type === "result" || type === "note") &&
    roleOk
  );
}

async function safeParseMessageFile(fullPath: string): Promise<ArcMessage | null> {
  let raw: string;
  try {
    raw = await fs.readFile(fullPath, "utf-8");
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  return isArcMessage(parsed) ? parsed : null;
}

export function getRootPath(cwd: string = process.cwd()): string {
  return path.join(cwd, ROOT_DIR);
}

export function getMessagesPath(cwd: string = process.cwd()): string {
  return path.join(getRootPath(cwd), MESSAGES_DIR);
}

export function getTasksPath(cwd: string = process.cwd()): string {
  return path.join(getRootPath(cwd), TASKS_DIR);
}

export async function ensureInitialized(cwd: string = process.cwd()): Promise<void> {
  const rootPath = getRootPath(cwd);
  try {
    await fs.access(rootPath);
  } catch {
    throw new Error("Run `arc init` first.");
  }
}

export async function initializeWorkspace(cwd: string = process.cwd()): Promise<void> {
  const rootPath = getRootPath(cwd);
  const messagesPath = getMessagesPath(cwd);
  const tasksPath = getTasksPath(cwd);
  const contextPath = path.join(rootPath, CONTEXT_FILE);

  await fs.mkdir(messagesPath, { recursive: true });
  await fs.mkdir(tasksPath, { recursive: true });

  const defaultContext = {
    product: "Confluxa",
    protocol: "ARC",
    version: "0.1.0",
    created_at: new Date().toISOString()
  };

  try {
    await fs.access(contextPath);
  } catch {
    await fs.writeFile(contextPath, JSON.stringify(defaultContext, null, 2), "utf-8");
  }
}

export async function saveMessage(
  message: ArcMessage,
  cwd: string = process.cwd()
): Promise<string> {
  await ensureInitialized(cwd);
  const messagesPath = getMessagesPath(cwd);
  const fileName = `${message.timestamp.replace(/[:.]/g, "-")}-${message.id}.json`;
  const fullPath = path.join(messagesPath, fileName);
  await fs.writeFile(fullPath, JSON.stringify(message, null, 2), "utf-8");
  return fullPath;
}

export async function listMessages(cwd: string = process.cwd()): Promise<ArcMessage[]> {
  await ensureInitialized(cwd);
  const messagesPath = getMessagesPath(cwd);
  let files: string[];
  try {
    files = await fs.readdir(messagesPath);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") return [];
    throw err;
  }
  const jsonFiles = files.filter((file) => file.endsWith(".json"));

  const parsed = await Promise.all(
    jsonFiles.map(async (file) => {
      const fullPath = path.join(messagesPath, file);
      return safeParseMessageFile(fullPath);
    })
  );

  return parsed
    .filter((msg): msg is ArcMessage => msg !== null)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function listMessagesByTask(
  taskId: string,
  cwd: string = process.cwd()
): Promise<ArcMessage[]> {
  const all = await listMessages(cwd);
  return all.filter((item) => item.task_id === taskId);
}

export async function deleteMessagesByTask(
  taskId: string,
  cwd: string = process.cwd()
): Promise<number> {
  await ensureInitialized(cwd);
  const messagesPath = getMessagesPath(cwd);
  let files: string[];
  try {
    files = await fs.readdir(messagesPath);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") return 0;
    throw err;
  }
  const jsonFiles = files.filter((file) => file.endsWith(".json"));
  let deleted = 0;

  for (const file of jsonFiles) {
    const fullPath = path.join(messagesPath, file);
    const parsed = await safeParseMessageFile(fullPath);
    if (!parsed) continue;

    if (parsed.task_id === taskId) {
      try {
        await fs.unlink(fullPath);
        deleted += 1;
      } catch {
        // If a file disappears between readdir and unlink, treat as best-effort.
      }
    }
  }

  return deleted;
}

export async function getWorkspaceStatus(cwd: string = process.cwd()): Promise<{
  workspaceOk: boolean;
  tasksCount: number;
  messagesCount: number;
  recentTasks: string[];
}> {
  const rootPath = getRootPath(cwd);

  try {
    await fs.access(rootPath);
  } catch {
    return { workspaceOk: false, tasksCount: 0, messagesCount: 0, recentTasks: [] };
  }

  const messages = await listMessages(cwd);
  const uniqueTasks = [...new Set(messages.map((msg) => msg.task_id))];

  const taskLastSeen = new Map<string, string>();
  for (const msg of messages) {
    const prev = taskLastSeen.get(msg.task_id);
    if (!prev || prev < msg.timestamp) {
      taskLastSeen.set(msg.task_id, msg.timestamp);
    }
  }

  const recentTasks = [...taskLastSeen.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .slice(0, 5)
    .map(([taskId]) => taskId);

  return {
    workspaceOk: true,
    tasksCount: uniqueTasks.length,
    messagesCount: messages.length,
    recentTasks
  };
}
