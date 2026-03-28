import chalk from "chalk";
import { getWorkspaceStatus } from "../core/storage";

export async function runStatus(): Promise<void> {
  const status = await getWorkspaceStatus();

  if (!status.workspaceOk) {
    console.log(`Workspace: ${chalk.red("MISSING")}`);
    console.log("Run `arc init` first");
    return;
  }

  console.log(`Workspace: ${chalk.green("OK")}`);
  console.log(`Tasks: ${status.tasksCount}`);
  console.log(`Messages: ${status.messagesCount}`);
  console.log("Recent tasks:");

  if (status.recentTasks.length === 0) {
    console.log("* (none)");
    return;
  }

  for (const task of status.recentTasks) {
    console.log(`* ${task}`);
  }
}
