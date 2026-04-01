import { deleteMessagesByTask } from "../core/storage";

export async function runClean(taskId: string): Promise<void> {
  const normalizedTaskId = taskId?.trim();
  if (!normalizedTaskId) {
    throw new Error("Task id is required. Usage: arc clean <task>");
  }

  const deleted = await deleteMessagesByTask(normalizedTaskId);
  if (deleted === 0) {
    console.log(`No messages found for task ${normalizedTaskId}`);
    return;
  }

  console.log(`Cleared all messages for task ${normalizedTaskId}`);
}
