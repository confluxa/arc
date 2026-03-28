import { promises as fs } from "node:fs";
import path from "node:path";
import { ArcMessage } from "./types";

const ROOT_DIR = ".confluxa";
const CONTEXT_FILE = "context.json";
const MESSAGES_DIR = "messages";
const TASKS_DIR = "tasks";

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

export async function saveMessage(message: ArcMessage, cwd: string = process.cwd()): Promise<string> {
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
  const files = await fs.readdir(messagesPath);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));

  const parsed = await Promise.all(
    jsonFiles.map(async (file) => {
      const fullPath = path.join(messagesPath, file);
      const raw = await fs.readFile(fullPath, "utf-8");
      return JSON.parse(raw) as ArcMessage;
    })
  );

  return parsed.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function listMessagesByTask(taskId: string, cwd: string = process.cwd()): Promise<ArcMessage[]> {
  const all = await listMessages(cwd);
  return all.filter((item) => item.task_id === taskId);
}

export async function deleteMessagesByTask(taskId: string, cwd: string = process.cwd()): Promise<number> {
  await ensureInitialized(cwd);
  const messagesPath = getMessagesPath(cwd);
  const files = await fs.readdir(messagesPath);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));
  let deleted = 0;

  for (const file of jsonFiles) {
    const fullPath = path.join(messagesPath, file);
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw) as ArcMessage;
    if (parsed.task_id === taskId) {
      await fs.unlink(fullPath);
      deleted += 1;
    }
  }

  return deleted;
}

export async function getWorkspaceStatus(
  cwd: string = process.cwd()
): Promise<{ workspaceOk: boolean; tasksCount: number; messagesCount: number; recentTasks: string[] }> {
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
